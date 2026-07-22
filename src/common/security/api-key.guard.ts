import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { AppLoggerService } from '../logger/logger.service';
import { IS_PUBLIC_KEY } from './public.decorator';
import { API_KEY_HEADER, SECURITY_SKIP_PREFIXES } from './security.constants';

/**
 * 基于请求头的 API Key 鉴权守卫。
 *
 * - 通过 `API_KEY_AUTH_ENABLED` 开关控制是否启用（默认在配置了 API_KEYS 时启用）。
 * - 支持多个 Key（逗号分隔），便于不同调用方分配独立凭证与轮换。
 * - `/metrics`、`/api`（Swagger）以及标记了 @Public() 的路由会被放行。
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly enabled: boolean;
  private readonly apiKeys: string[];

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(ApiKeyGuard.name);
    this.apiKeys = this.parseApiKeys(
      this.configService.get<string>('API_KEYS'),
    );
    this.enabled = this.resolveEnabled();

    if (this.enabled && this.apiKeys.length === 0) {
      this.logger.warn(
        'API Key 鉴权已启用，但未配置任何 API_KEYS，所有受保护的请求都会被拒绝。',
      );
    }
    if (!this.enabled) {
      this.logger.warn(
        'API Key 鉴权未启用（仅建议在受信任的内网环境中关闭）。',
      );
    }
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.enabled) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    if (this.shouldSkip(context, request)) {
      return true;
    }

    const providedKey = this.extractApiKey(request);
    if (!providedKey) {
      throw new UnauthorizedException('缺少 API Key');
    }
    if (!this.isValidApiKey(providedKey)) {
      throw new UnauthorizedException('无效的 API Key');
    }

    return true;
  }

  private shouldSkip(context: ExecutionContext, request: Request): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const url = request.url ?? '';
    return SECURITY_SKIP_PREFIXES.some((prefix) => url.startsWith(prefix));
  }

  private extractApiKey(request: Request): string | undefined {
    const headerValue = request.headers[API_KEY_HEADER];
    const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    return raw?.trim() || undefined;
  }

  private parseApiKeys(value: string | undefined): string[] {
    if (!value) {
      return [];
    }

    return [
      ...new Set(
        value
          .split(',')
          .map((key) => key.trim())
          .filter((key) => key.length > 0),
      ),
    ];
  }

  private isValidApiKey(providedKey: string): boolean {
    if (providedKey.length > 512) {
      return false;
    }

    const candidate = Buffer.from(providedKey);
    return this.apiKeys.some((apiKey) => {
      const configuredKey = Buffer.from(apiKey);
      return (
        candidate.length === configuredKey.length &&
        timingSafeEqual(candidate, configuredKey)
      );
    });
  }

  private resolveEnabled(): boolean {
    const flag = this.configService.get<boolean | string>(
      'API_KEY_AUTH_ENABLED',
    );
    if (flag === undefined || flag === '') {
      // 未显式配置时，按是否提供了 API_KEYS 自动决定，避免本地开发被意外拦截。
      return this.apiKeys.length > 0;
    }
    return flag === true || flag === 'true' || flag === '1';
  }
}
