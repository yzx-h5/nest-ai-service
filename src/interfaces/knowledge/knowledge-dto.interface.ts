export interface UploadDocumentSchemaInput {
  buffer: Buffer;
  originalname: string;
}

export interface ImportTextSchemaInput {
  text: string;
  source?: string;
}

export interface QueryKnowledgeSchemaInput {
  question: string;
  stream?: boolean;
}

export interface ListDocumentsSchemaInput {
  page: number;
  pageSize: number;
  source?: string;
}

export interface DeleteDocumentsBySourceSchemaInput {
  source: string;
}

export interface DeleteDocumentParamSchemaInput {
  id: string;
}
