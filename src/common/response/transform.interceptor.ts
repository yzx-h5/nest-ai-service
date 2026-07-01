import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import { Observable, map } from 'rxjs';
import { isApiResponse, successResponse } from './api-response';
import { SKIP_RESPONSE_TRANSFORM_KEY } from './skip-response-transform.decorator';

const SKIP_PATH_PREFIXES = ['/metrics', '/api'];

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skipByDecorator = this.reflector.getAllAndOverride<boolean>(
      SKIP_RESPONSE_TRANSFORM_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest<{ url: string }>();
    const response = context.switchToHttp().getResponse<Response>();
    const shouldSkip =
      skipByDecorator ||
      response.headersSent ||
      SKIP_PATH_PREFIXES.some((prefix) => request.url.startsWith(prefix));

    if (shouldSkip) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        if (isApiResponse(data)) {
          return data;
        }

        return successResponse(data);
      }),
    );
  }
}
