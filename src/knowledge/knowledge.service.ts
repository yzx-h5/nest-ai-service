import { Document } from '@langchain/core/documents';
import { QdrantVectorStore } from '@langchain/qdrant';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
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
    const qdrantUrl = this.configService.get<string>(
      'QDRANT_URL',
      'http://localhost:6333',
    );

    const embeddings = new OpenAIEmbeddings({
      model: this.configService.get<string>(
        'OPENAI_EMBEDDING_MODEL',
        'deepseek-embedding-v2',
      ),
      apiKey: getEmbeddingApiKey(this.configService),
      configuration: buildOpenAiClientConfig(this.configService, 'embedding'),
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

    const answer = await this.langchainService.invoke(question, systemPrompt);

    return { answer, sources };
  }
}
