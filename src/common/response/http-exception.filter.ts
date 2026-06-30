import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { errorResponse } from './api-response';
import { ResponseCode, httpStatusToResponseCode } from './response-code.enum';

const SKIP_PATH_PREFIXES = ['/metrics', '/api'];

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<{ url: string }>();

    if (SKIP_PATH_PREFIXES.some((prefix) => request.url.startsWith(prefix))) {
      if (exception instanceof HttpException) {
        response.status(exception.getStatus()).json(exception.getResponse());
        return;
      }

      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });
      return;
    }

    const { status, code, message } = this.resolveException(exception);
    response.status(status).json(errorResponse(code, message));
  }

  private resolveException(exception: unknown): {
    status: number;
    code: ResponseCode;
    message: string;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      return {
        status,
        code: httpStatusToResponseCode(status),
        message: this.extractMessage(exceptionResponse),
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ResponseCode.INTERNAL_ERROR,
      message: 'Internal server error',
    };
  }

  private extractMessage(exceptionResponse: string | object): string {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    const response = exceptionResponse as {
      message?: string | string[];
      error?: string;
    };

    if (Array.isArray(response.message)) {
      return response.message.join('; ');
    }

    if (typeof response.message === 'string') {
      return response.message;
    }

    if (typeof response.error === 'string') {
      return response.error;
    }

    return 'Internal server error';
  }
}
