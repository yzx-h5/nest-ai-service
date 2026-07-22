import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RequestContextService } from './request-context.service';
import { RequestIdMiddleware } from './request-id.middleware';

@Global()
@Module({
  providers: [RequestContextService, RequestIdMiddleware],
  exports: [RequestContextService],
})
export class RequestModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
