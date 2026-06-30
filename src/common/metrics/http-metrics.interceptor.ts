import { ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { CallHandler } from '@nestjs/common/interfaces';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';
import { Observable, tap } from 'rxjs';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_requests_total')
    private readonly requestsTotal: Counter<string>,
    @InjectMetric('http_request_duration_seconds')
    private readonly requestDuration: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      method: string;
      route?: { path: string };
      path?: string;
      url: string;
    }>();

    const method = request.method;
    const route =
      request.route?.path ?? request.path ?? request.url.split('?')[0];

    if (route === '/metrics') {
      return next.handle();
    }

    const endTimer = this.requestDuration.startTimer({ method, route });

    return next.handle().pipe(
      tap({
        next: () => {
          const status = String(
            context.switchToHttp().getResponse<{ statusCode: number }>()
              .statusCode,
          );
          this.requestsTotal.inc({ method, route, status });
          endTimer({ status });
        },
        error: () => {
          const status = String(
            context.switchToHttp().getResponse<{ statusCode: number }>()
              .statusCode || 500,
          );
          this.requestsTotal.inc({ method, route, status });
          endTimer({ status });
        },
      }),
    );
  }
}
