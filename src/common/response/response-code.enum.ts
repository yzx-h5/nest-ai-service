export enum ResponseCode {
  SUCCESS = 0,

  BAD_REQUEST = 40000,
  UNAUTHORIZED = 40100,
  FORBIDDEN = 40300,
  NOT_FOUND = 40400,
  METHOD_NOT_ALLOWED = 40500,
  CONFLICT = 40900,
  VALIDATION_ERROR = 42200,
  TOO_MANY_REQUESTS = 42900,

  INTERNAL_ERROR = 50000,
  SERVICE_UNAVAILABLE = 50300,
}

export const RESPONSE_MESSAGES: Record<ResponseCode, string> = {
  [ResponseCode.SUCCESS]: 'success',

  [ResponseCode.BAD_REQUEST]: 'Bad request',
  [ResponseCode.UNAUTHORIZED]: 'Unauthorized',
  [ResponseCode.FORBIDDEN]: 'Forbidden',
  [ResponseCode.NOT_FOUND]: 'Not found',
  [ResponseCode.METHOD_NOT_ALLOWED]: 'Method not allowed',
  [ResponseCode.CONFLICT]: 'Conflict',
  [ResponseCode.VALIDATION_ERROR]: 'Validation failed',
  [ResponseCode.TOO_MANY_REQUESTS]: 'Too many requests',

  [ResponseCode.INTERNAL_ERROR]: 'Internal server error',
  [ResponseCode.SERVICE_UNAVAILABLE]: 'Service unavailable',
};

export function httpStatusToResponseCode(status: number): ResponseCode {
  switch (status) {
    case 400:
      return ResponseCode.BAD_REQUEST;
    case 401:
      return ResponseCode.UNAUTHORIZED;
    case 403:
      return ResponseCode.FORBIDDEN;
    case 404:
      return ResponseCode.NOT_FOUND;
    case 405:
      return ResponseCode.METHOD_NOT_ALLOWED;
    case 409:
      return ResponseCode.CONFLICT;
    case 422:
      return ResponseCode.VALIDATION_ERROR;
    case 429:
      return ResponseCode.TOO_MANY_REQUESTS;
    case 503:
      return ResponseCode.SERVICE_UNAVAILABLE;
    default:
      return status >= 500
        ? ResponseCode.INTERNAL_ERROR
        : ResponseCode.BAD_REQUEST;
  }
}
