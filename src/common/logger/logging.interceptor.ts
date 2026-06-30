import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AppLoggerService } from './logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('HTTP');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      ip?: string;
    }>();
    const { method, url, ip } = request;
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context
            .switchToHttp()
            .getResponse<{ statusCode: number }>();
          const duration = Date.now() - startedAt;
          this.logger.log(
            `${method} ${url} ${response.statusCode} ${duration}ms${ip ? ` ${ip}` : ''}`,
          );
        },
        error: (error: Error) => {
          const duration = Date.now() - startedAt;
          this.logger.error(
            `${method} ${url} failed ${duration}ms${ip ? ` ${ip}` : ''}`,
            error.stack,
          );
        },
      }),
    );
  }
}
