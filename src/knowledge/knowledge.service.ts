import { Document } from '@langchain/core/documents';
import { QdrantVectorStore } from '@langchain/qdrant';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentParserService } from './document-parser.service';
import { LangchainService } from '../langchain/langchain.service';
import {
  buildOpenAiClientConfig,
  getEmbeddingApiKey,
} from '../common/ai/llm-config';

export interface ImportDocumentResult {
  chunksAdded: number;
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

    const embeddings = new OpenAIEmbeddings({
      model: this.configService.getOrThrow<string>('OPENAI_EMBEDDING_MODEL'),
      apiKey: getEmbeddingApiKey(this.configService),
      configuration: buildOpenAiClientConfig(this.configService, 'embedding'),
      batchSize: Number(
        this.configService.get<string>('EMBEDDING_BATCH_SIZE', '25'),
      ),
    });

    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: Number(
        this.configService.get<string>('KNOWLEDGE_CHUNK_SIZE', '1000'),
      ),
      chunkOverlap: Number(
        this.configService.get<string>('KNOWLEDGE_CHUNK_OVERLAP', '200'),
      ),
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

  async importText(
    text: string,
    metadata: Record<string, unknown> = {},
  ): Promise<ImportDocumentResult> {
    await this.ensureReady();

    const document = new Document({
      pageContent: text,
      metadata: {
        ...metadata,
        importedAt: new Date().toISOString(),
      },
    });

    const chunks = await this.textSplitter.splitDocuments([document]);
    await this.vectorStore.addDocuments(chunks);

    return {
      chunksAdded: chunks.length,
      source: typeof metadata.source === 'string' ? metadata.source : undefined,
    };
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

    const k = Number(
      this.configService.get<string>('KNOWLEDGE_RETRIEVAL_K', '4'),
    );
    const results = await this.vectorStore.similaritySearchWithScore(
      question,
      k,
    );

    const sources: KnowledgeSourceDto[] = results.map(([doc, score]) => ({
      content: doc.pageContent,
      score,
      metadata: doc.metadata as Record<string, unknown>,
    }));

    const context = sources
      .map((source, index) => `[${index + 1}] ${source.content}`)
      .join('\n\n');

    const systemPrompt = [
      '你是一个知识库助手。请基于以下检索到的资料回答问题。',
      '如果资料中没有相关信息，请明确说明无法从知识库中找到答案。',
      '回答时尽量引用资料编号。',
      '',
      context,
    ].join('\n');

    return { sources, systemPrompt };
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

  async deleteDocumentById(id: string): Promise<DeleteKnowledgeDocumentsResult> {
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

  private mapPointToChunkItem(point: {
    id: string | number;
    payload?: Record<string, unknown> | null;
  }): KnowledgeChunkItem {
    const metadata = (point.payload?.metadata ?? {}) as Record<string, unknown>;

    return {
      id: String(point.id),
      content: String(point.payload?.content ?? ''),
      source: typeof metadata.source === 'string' ? metadata.source : undefined,
      fileType:
        typeof metadata.fileType === 'string' ? metadata.fileType : undefined,
      importedAt:
        typeof metadata.importedAt === 'string' ? metadata.importedAt : undefined,
      metadata,
    };
  }
}
