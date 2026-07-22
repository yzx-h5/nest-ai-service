import { Document } from '@langchain/core/documents';
import { QdrantVectorStore } from '@langchain/qdrant';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentParserService } from './document-parser.service';
import { LangchainService } from '../langchain/langchain.service';
import {
  buildOpenAiClientConfig,
  getEmbeddingApiKey,
} from '../common/ai/llm-config';

export interface ImportDocumentResult {
  chunksAdded: number;
  chunksSkipped: number;
  charsExtracted: number;
  source?: string;
}

export interface KnowledgeSourceDto {
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface QueryKnowledgeResult {
  answer: string;
  sources: KnowledgeSourceDto[];
}

export interface KnowledgeChunkItem {
  id: string;
  content: string;
  source?: string;
  fileType?: string;
  importedAt?: string;
  metadata: Record<string, unknown>;
}

export interface ListKnowledgeDocumentsResult {
  items: KnowledgeChunkItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DeleteKnowledgeDocumentsResult {
  deletedCount: number;
}

type QdrantScrollOffset = string | number | Record<string, unknown>;

@Injectable()
export class KnowledgeService {
  private vectorStore: QdrantVectorStore;
  private textSplitter: RecursiveCharacterTextSplitter;
  private initPromise: Promise<void> | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly langchainService: LangchainService,
    private readonly documentParserService: DocumentParserService,
  ) {}

  private async ensureReady(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.initialize().catch((error: unknown) => {
        this.initPromise = null;
        throw error;
      });
    }
    await this.initPromise;
  }

  private wrapVectorStoreError(error: unknown, qdrantUrl: string): never {
    const message = error instanceof Error ? error.message : String(error);
    const isConnectionError =
      message.includes('fetch failed') ||
      message.includes('ECONNREFUSED') ||
      message.includes('Failed to obtain server version') ||
      message.includes('ENOTFOUND');

    if (isConnectionError) {
      throw new ServiceUnavailableException(
        `无法连接 Qdrant 向量库（${qdrantUrl}）。请先启动 Docker，再执行: docker compose up -d qdrant`,
      );
    }

    throw error;
  }

  private async initialize(): Promise<void> {
    const qdrantUrl = this.configService.getOrThrow<string>('QDRANT_URL');
    const chunkSize = this.getPositiveIntegerConfig(
      'KNOWLEDGE_CHUNK_SIZE',
      1500,
    );
    const chunkOverlap = this.getNonNegativeIntegerConfig(
      'KNOWLEDGE_CHUNK_OVERLAP',
      300,
    );

    if (chunkOverlap >= chunkSize) {
      throw new Error('KNOWLEDGE_CHUNK_OVERLAP 必须小于 KNOWLEDGE_CHUNK_SIZE');
    }

    const embeddings = new OpenAIEmbeddings({
      model: this.configService.getOrThrow<string>('OPENAI_EMBEDDING_MODEL'),
      apiKey: getEmbeddingApiKey(this.configService),
      configuration: buildOpenAiClientConfig(this.configService, 'embedding'),
      batchSize: this.getPositiveIntegerConfig('EMBEDDING_BATCH_SIZE', 25),
    });

    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
    });

    this.vectorStore = new QdrantVectorStore(embeddings, {
      url: qdrantUrl,
      apiKey: this.configService.get<string>('QDRANT_API_KEY'),
      collectionName: this.configService.get<string>(
        'QDRANT_COLLECTION',
        'knowledge_base',
      ),
    });

    try {
      await this.vectorStore.ensureCollection();
    } catch (error) {
      this.wrapVectorStoreError(error, qdrantUrl);
    }
  }

  private getPositiveIntegerConfig(key: string, fallback: number): number {
    return this.getIntegerConfig(key, fallback, 1);
  }

  private getNonNegativeIntegerConfig(key: string, fallback: number): number {
    return this.getIntegerConfig(key, fallback, 0);
  }

  private getIntegerConfig(
    key: string,
    fallback: number,
    minimum: number,
  ): number {
    const rawValue = this.configService.get<string | number>(key);
    if (
      rawValue === undefined ||
      (typeof rawValue === 'string' && rawValue.trim() === '')
    ) {
      return fallback;
    }

    const value = Number(rawValue);
    if (!Number.isInteger(value) || value < minimum) {
      throw new Error(`${key} 必须是大于等于 ${minimum} 的整数`);
    }

    return value;
  }

  private async runVectorStoreOperation<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
    const qdrantUrl = this.configService.getOrThrow<string>('QDRANT_URL');

    try {
      return await operation();
    } catch (error) {
      this.wrapVectorStoreError(error, qdrantUrl);
    }
  }

  async importText(
    text: string,
    metadata: Record<string, unknown> = {},
  ): Promise<ImportDocumentResult> {
    await this.ensureReady();

    if (!text.trim()) {
      throw new BadRequestException('导入文本不能为空');
    }

    const document = new Document({
      pageContent: text,
      metadata: {
        ...metadata,
        importedAt: new Date().toISOString(),
      },
    });

    const rawChunks = await this.textSplitter.splitDocuments([document]);
    const chunks = rawChunks.filter((chunk) =>
      this.isUsefulChunk(chunk.pageContent),
    );
    const chunksSkipped = rawChunks.length - chunks.length;

    if (chunks.length === 0) {
      throw new BadRequestException(
        '文档切分后没有可用文本片段（可能全是页码/页眉页脚）',
      );
    }

    await this.runVectorStoreOperation(() =>
      this.vectorStore.addDocuments(chunks),
    );

    return {
      chunksAdded: chunks.length,
      chunksSkipped,
      charsExtracted: text.length,
      source: typeof metadata.source === 'string' ? metadata.source : undefined,
    };
  }

  /** 过滤过短或仅含页码的无信息切片，避免污染检索。 */
  private isUsefulChunk(content: string): boolean {
    const trimmed = content.trim();
    if (trimmed.length < 40) {
      return false;
    }
    if (
      /^(?:--\s*)?(?:Page\s+)?\d+\s*(?:of|\/)\s*\d+(?:\s*--)?$/i.test(trimmed)
    ) {
      return false;
    }
    return true;
  }

  async importFile(
    buffer: Buffer,
    filename: string,
    metadata: Record<string, unknown> = {},
  ): Promise<ImportDocumentResult> {
    const text = await this.documentParserService.parse(buffer, filename);
    const extension = this.documentParserService.getExtension(filename);
    return this.importText(text, {
      ...metadata,
      source: filename,
      fileType: extension.slice(1),
    });
  }

  async query(question: string): Promise<QueryKnowledgeResult> {
    const { sources, systemPrompt } = await this.retrieveContext(question);
    const answer = await this.langchainService.invoke(question, systemPrompt);
    return { answer, sources };
  }

  async streamQuery(
    question: string,
    emit: (payload: unknown) => void,
  ): Promise<void> {
    emit({
      type: 'step',
      step: 'retrieving',
      message: '正在检索知识库...',
    });

    const { sources, systemPrompt } = await this.retrieveContext(question);

    emit({
      type: 'step',
      step: 'retrieved',
      message: `知识检索完成，找到 ${sources.length} 条相关资料`,
      data: { sources, count: sources.length },
    });

    emit({
      type: 'step',
      step: 'generating',
      message: '正在生成回答...',
    });

    let answer = '';
    for await (const token of this.langchainService.stream(
      question,
      systemPrompt,
    )) {
      answer += token;
      emit({ type: 'token', content: token });
    }

    emit({
      type: 'result',
      data: { answer, sources },
    });
  }

  private async retrieveContext(question: string): Promise<{
    sources: KnowledgeSourceDto[];
    systemPrompt: string;
  }> {
    await this.ensureReady();

    const k = this.getPositiveIntegerConfig('KNOWLEDGE_RETRIEVAL_K', 8);
    const fetchK = this.getPositiveIntegerConfig('KNOWLEDGE_FETCH_K', 24);

    const terms = this.extractSearchTerms(question);
    const scoredPairs = await this.runVectorStoreOperation(() =>
      this.vectorStore.similaritySearchWithScore(question, Math.max(fetchK, k)),
    );

    // 在向量检索的候选集内重排，避免每次提问都线性扫描整个 collection。
    const questionLower = question.toLowerCase().trim();
    const sources = this.deduplicateSources(
      scoredPairs
        .map(([doc, score]) => ({
          content: doc.pageContent,
          score:
            score + this.keywordBoost(doc.pageContent, terms, questionLower),
          metadata: doc.metadata as Record<string, unknown>,
        }))
        .sort((a, b) => b.score - a.score),
    ).slice(0, k);

    const context = sources
      .map((source, index) => `[${index + 1}] ${source.content}`)
      .join('\n\n');

    const systemPrompt = [
      '你是一个知识库助手。请严格基于以下检索到的资料回答问题。',
      '回答要求：',
      '1. 综合利用全部相关资料，不要只依赖某一条；不同资料中的信息应合并去重后完整给出。',
      '2. 当用户要求“全部 / 详细 / 列出 / 完整”等信息时，尽量穷尽资料中出现的字段与取值，按条目清晰列出，不要概括省略。',
      '3. 若多条资料互相补充，请一并整理；若互相冲突，请注明差异并引用资料编号。',
      '4. 回答中引用资料编号（如 [1]、[2]）。资料中没有的信息不要编造；若确实找不到，请明确说明。',
      '5. 注意缩写与全称可能同时出现（例如 APA = Automatic Premium Allocation），只要资料中语义相关就应一并整理。',
      '',
      '检索资料：',
      context,
    ].join('\n');

    return { sources, systemPrompt };
  }

  /** 从问题中提取检索关键词（英文词、数字、中文片段）。 */
  private extractSearchTerms(question: string): string[] {
    const stop = new Set([
      'a',
      'an',
      'the',
      'is',
      'are',
      'was',
      'were',
      'of',
      'in',
      'on',
      'for',
      'to',
      'and',
      'or',
      'what',
      'how',
      'who',
      'where',
      'when',
      'which',
      'with',
      'from',
      'about',
      'please',
      '的',
      '是',
      '什么',
      '怎么',
      '如何',
      '多少',
      '一下',
      '告诉',
      '给我',
      '列出',
      '详细',
      '全部',
      '信息',
    ]);

    const raw = question
      .toLowerCase()
      .match(/[a-z][a-z0-9]{1,}|[\u4e00-\u9fff]{2,}/g);

    if (!raw) {
      return [];
    }

    return [...new Set(raw.filter((term) => !stop.has(term)))];
  }

  private keywordBoost(
    content: string,
    terms: string[],
    questionLower: string,
  ): number {
    if (terms.length === 0) {
      return 0;
    }

    const lower = content.toLowerCase();
    let boost = 0;

    if (questionLower.length >= 3 && lower.includes(questionLower)) {
      boost += 1.2;
    }

    const hitCount = terms.filter((term) =>
      this.matchesKeyword(lower, term),
    ).length;
    if (hitCount > 0) {
      boost += 0.25 * hitCount;
    }

    // 短缩写（≤4）命中时额外加权，避免被长词泛匹配淹没
    for (const term of terms) {
      if (term.length <= 4 && this.matchesKeyword(lower, term)) {
        boost += 0.6;
      }
    }

    return boost;
  }

  private matchesKeyword(content: string, term: string): boolean {
    if (!/^[a-z0-9]+$/.test(term)) {
      return content.includes(term);
    }

    return new RegExp(`(^|[^a-z0-9])${term}(?=$|[^a-z0-9])`).test(content);
  }

  private deduplicateSources(
    sources: KnowledgeSourceDto[],
  ): KnowledgeSourceDto[] {
    const seen = new Set<string>();
    const uniqueSources: KnowledgeSourceDto[] = [];

    for (const source of sources) {
      if (seen.has(source.content)) {
        continue;
      }
      seen.add(source.content);
      uniqueSources.push(source);
    }

    return uniqueSources;
  }

  async listDocuments(options: {
    page: number;
    pageSize: number;
    source?: string;
  }): Promise<ListKnowledgeDocumentsResult> {
    await this.ensureReady();

    const qdrantUrl = this.configService.getOrThrow<string>('QDRANT_URL');
    const filter = this.buildSourceFilter(options.source);
    const { page, pageSize } = options;

    try {
      const countResult = await this.vectorStore.client.count(
        this.vectorStore.collectionName,
        {
          filter,
          exact: true,
        },
      );
      const total = countResult.count;
      const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

      if (total === 0 || page > totalPages) {
        return { items: [], total, page, pageSize, totalPages };
      }

      let offset: QdrantScrollOffset | undefined;
      let skip = (page - 1) * pageSize;

      while (skip > 0) {
        const batchSize = Math.min(skip, 100);
        const skipped = await this.vectorStore.client.scroll(
          this.vectorStore.collectionName,
          {
            filter,
            limit: batchSize,
            offset,
            with_payload: ['content', 'metadata'],
            with_vector: false,
          },
        );

        if (skipped.points.length === 0) {
          return { items: [], total, page, pageSize, totalPages };
        }

        offset = skipped.next_page_offset ?? undefined;
        skip -= skipped.points.length;

        if (offset === undefined) {
          return { items: [], total, page, pageSize, totalPages };
        }
      }

      const result = await this.vectorStore.client.scroll(
        this.vectorStore.collectionName,
        {
          filter,
          limit: pageSize,
          offset,
          with_payload: ['content', 'metadata'],
          with_vector: false,
        },
      );

      return {
        items: result.points.map((point) => this.mapPointToChunkItem(point)),
        total,
        page,
        pageSize,
        totalPages,
      };
    } catch (error) {
      this.wrapVectorStoreError(error, qdrantUrl);
    }
  }

  async deleteDocumentById(
    id: string,
  ): Promise<DeleteKnowledgeDocumentsResult> {
    await this.ensureReady();

    const qdrantUrl = this.configService.getOrThrow<string>('QDRANT_URL');

    try {
      const existing = await this.vectorStore.client.retrieve(
        this.vectorStore.collectionName,
        {
          ids: [id],
          with_payload: false,
          with_vector: false,
        },
      );

      if (existing.length === 0) {
        throw new NotFoundException(`未找到 id 为 ${id} 的知识库片段`);
      }

      await this.vectorStore.delete({ ids: [id] });
      return { deletedCount: 1 };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.wrapVectorStoreError(error, qdrantUrl);
    }
  }

  async deleteDocumentsBySource(
    source: string,
  ): Promise<DeleteKnowledgeDocumentsResult> {
    await this.ensureReady();

    const qdrantUrl = this.configService.getOrThrow<string>('QDRANT_URL');
    const filter = this.buildSourceFilter(source)!;

    try {
      const countResult = await this.vectorStore.client.count(
        this.vectorStore.collectionName,
        {
          filter,
          exact: true,
        },
      );

      if (countResult.count === 0) {
        throw new NotFoundException(`未找到 source 为 ${source} 的知识库文档`);
      }

      await this.vectorStore.delete({ filter });
      return { deletedCount: countResult.count };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.wrapVectorStoreError(error, qdrantUrl);
    }
  }

  private buildSourceFilter(source?: string) {
    if (!source) {
      return undefined;
    }

    return {
      must: [
        {
          key: 'metadata.source',
          match: { value: source },
        },
      ],
    };
  }

  private payloadContentAsString(content: unknown): string {
    return typeof content === 'string' ? content : '';
  }

  private mapPointToChunkItem(point: {
    id: string | number;
    payload?: Record<string, unknown> | null;
  }): KnowledgeChunkItem {
    const metadata = (point.payload?.metadata ?? {}) as Record<string, unknown>;

    return {
      id: String(point.id),
      content: this.payloadContentAsString(point.payload?.content),
      source: typeof metadata.source === 'string' ? metadata.source : undefined,
      fileType:
        typeof metadata.fileType === 'string' ? metadata.fileType : undefined,
      importedAt:
        typeof metadata.importedAt === 'string'
          ? metadata.importedAt
          : undefined,
      metadata,
    };
  }
}
