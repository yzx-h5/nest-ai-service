export interface EnvironmentVariables extends Record<string, unknown> {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  LOG_LEVEL: 'fatal' | 'error' | 'warn' | 'log' | 'debug' | 'verbose';
  CORS_ENABLED: boolean;
  CORS_ORIGIN: string;
  API_KEY_AUTH_ENABLED?: boolean;
  API_KEYS?: string;
  RATE_LIMIT_TTL: number;
  RATE_LIMIT_MAX: number;
  BODY_SIZE_LIMIT: string;
  TRUST_PROXY: boolean;
  SWAGGER_ENABLED?: boolean;
  QDRANT_URL?: string;
  QDRANT_COLLECTION?: string;
  OPENAI_BASE_URL?: string;
  OPENAI_MODEL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_TEMPERATURE: number;
  EMBEDDING_BASE_URL?: string;
  EMBEDDING_API_KEY?: string;
  OPENAI_EMBEDDING_MODEL?: string;
}
