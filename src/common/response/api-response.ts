import { ResponseCode, RESPONSE_MESSAGES } from './response-code.enum';
import type { ApiResponse } from '../../interfaces/common/response.interface';

export function successResponse<T>(
  data: T,
  message = RESPONSE_MESSAGES[ResponseCode.SUCCESS],
): ApiResponse<T> {
  return {
    code: ResponseCode.SUCCESS,
    message,
    data,
  };
}

export function errorResponse(
  code: ResponseCode,
  message = RESPONSE_MESSAGES[code],
  requestId?: string,
): ApiResponse<null> {
  return {
    code,
    message,
    data: null,
    ...(requestId ? { requestId } : {}),
  };
}

export function isApiResponse(value: unknown): value is ApiResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as ApiResponse;
  return (
    typeof candidate.code === 'number' &&
    typeof candidate.message === 'string' &&
    'data' in candidate
  );
}
