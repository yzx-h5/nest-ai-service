import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ReadinessResult } from '../interfaces/health/readiness.interface';

@Injectable()
export class HealthService {
  constructor(private readonly configService: ConfigService) {}

  live() {
    return {
      status: 'ok' as const,
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  async ready(): Promise<ReadinessResult> {
    const qdrantUrl = this.configService.get<string>('QDRANT_URL');
    if (!qdrantUrl) {
      return { status: 'ok', checks: { qdrant: 'not_configured' } };
    }

    try {
      const apiKey = this.configService.get<string>('QDRANT_API_KEY');
      const response = await fetch(`${qdrantUrl.replace(/\/$/, '')}/readyz`, {
        signal: AbortSignal.timeout(2_000),
        headers: apiKey ? { 'api-key': apiKey } : undefined,
      });
      if (!response.ok) {
        throw new Error(`Qdrant readiness returned ${response.status}`);
      }
    } catch {
      throw new ServiceUnavailableException('依赖服务暂不可用');
    }

    return { status: 'ok', checks: { qdrant: 'up' } };
  }
}
