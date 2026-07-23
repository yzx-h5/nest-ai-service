import { ConfigService } from '@nestjs/config';
import type { OpenAiClientConfig } from '../../interfaces/common/ai.interface';

function normalizeEmbeddingBaseUrl(
  baseUrl: string | undefined,
): string | undefined {
  if (!baseUrl) {
    return baseUrl;
  }

  return baseUrl.replace(/\/embeddings\/?$/, '');
}

function isTruthyEnv(value: string | undefined): boolean {
  return value === 'true' || value === '1';
}

export function getLlmApiKey(configService: ConfigService): string | undefined {
  return configService.get<string>('OPENAI_API_KEY');
}

export function getLlmBaseUrl(
  configService: ConfigService,
): string | undefined {
  return configService.get<string>('OPENAI_BASE_URL');
}

export function getEmbeddingApiKey(
  configService: ConfigService,
): string | undefined {
  return (
    configService.get<string>('EMBEDDING_API_KEY') ??
    configService.get<string>('OPENAI_API_KEY')
  );
}

export function getEmbeddingBaseUrl(
  configService: ConfigService,
): string | undefined {
  const baseUrl =
    configService.get<string>('EMBEDDING_BASE_URL') ??
    configService.get<string>('OPENAI_BASE_URL');

  return normalizeEmbeddingBaseUrl(baseUrl);
}

export function getEmbeddingDefaultHeaders(
  configService: ConfigService,
): Record<string, string> | undefined {
  if (!isTruthyEnv(configService.get<string>('EMBEDDING_FAILOVER_ENABLED'))) {
    return undefined;
  }

  return {
    'X-Failover-Enabled': 'true',
  };
}

export function buildOpenAiClientConfig(
  configService: ConfigService,
  target: 'llm' | 'embedding' = 'llm',
): OpenAiClientConfig {
  const apiKey =
    target === 'embedding'
      ? getEmbeddingApiKey(configService)
      : getLlmApiKey(configService);
  const baseURL =
    target === 'embedding'
      ? getEmbeddingBaseUrl(configService)
      : getLlmBaseUrl(configService);
  const defaultHeaders =
    target === 'embedding'
      ? getEmbeddingDefaultHeaders(configService)
      : undefined;

  return {
    baseURL,
    apiKey,
    ...(defaultHeaders ? { defaultHeaders } : {}),
  };
}
