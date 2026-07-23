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

export type QdrantScrollOffset = string | number | Record<string, unknown>;
