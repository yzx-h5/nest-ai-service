import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { SECURITY_SKIP_PREFIXES } from './security.constants';

/**
 * 自定义限流守卫：在默认 ThrottlerGuard 基础上，跳过对
 * /metrics（Prometheus 高频抓取）与 /api（Swagger）路径的限流。
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const url = request.url ?? '';
    const skip = SECURITY_SKIP_PREFIXES.some((prefix) =>
      url.startsWith(prefix),
    );
    return Promise.resolve(skip);
  }
}
