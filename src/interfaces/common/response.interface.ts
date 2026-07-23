import type { ResponseCode } from '../../common/response/response-code.enum';

export interface ApiResponse<T = unknown> {
  code: ResponseCode;
  message: string;
  data: T | null;
  requestId?: string;
}
