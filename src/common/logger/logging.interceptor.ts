import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { RequestContextService } from '../request/request-context.service';
import { AppLoggerService } from './logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger.setContext('HTTP');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      route?: { path: string };
    }>();
    const { method } = request;
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context
            .switchToHttp()
            .getResponse<{ statusCode: number }>();
          const duration = Date.now() - startedAt;
          this.logRequest(
            'http_request_completed',
            method,
            request,
            response.statusCode,
            duration,
          );
        },
      }),
    );
  }

  private logRequest(
    event: 'http_request_completed',
    method: string,
    request: { url: string; route?: { path: string } },
    status: number,
    durationMs: number,
  ): void {
    const path = request.route?.path ?? request.url.split('?')[0];
    if (path === '/metrics') {
      return;
    }

    this.logger.log(
      JSON.stringify({
        event,
        requestId: this.requestContext.getRequestId(),
        method,
        path,
        status,
        durationMs,
      }),
    );
  }
}
