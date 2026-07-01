import {
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return String(error);
}

/**
 * 将上游 OpenAI 兼容 API（LLM / Embedding）错误转换为可返回给客户端的 HTTP 异常。
 */
export function rethrowAiProviderError(
  error: unknown,
  provider = 'LLM',
): never {
  const message = getErrorMessage(error);
  const lower = message.toLowerCase();

  if (
    lower.includes('authentication') ||
    lower.includes('api key') ||
    lower.includes('401')
  ) {
    throw new ServiceUnavailableException(
      `${provider} 服务认证失败，请检查 OPENAI_API_KEY 与 OPENAI_BASE_URL 配置`,
    );
  }

  if (lower.includes('rate limit') || lower.includes('429')) {
    throw new HttpException(
      `${provider} 服务请求过于频繁，请稍后重试`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  if (
    lower.includes('fetch failed') ||
    lower.includes('econnrefused') ||
    lower.includes('enotfound') ||
    lower.includes('timeout')
  ) {
    throw new ServiceUnavailableException(
      `${provider} 服务暂时不可用，请检查网络或上游服务状态`,
    );
  }

  throw new ServiceUnavailableException(`${provider} 服务调用失败：${message}`);
}
