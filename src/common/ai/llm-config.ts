import { ConfigService } from '@nestjs/config';

interface OpenAiClientConfig {
  baseURL?: string;
  apiKey?: string;
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
  return (
    configService.get<string>('EMBEDDING_BASE_URL') ??
    configService.get<string>('OPENAI_BASE_URL')
  );
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

  return {
    baseURL,
    apiKey,
  };
}
