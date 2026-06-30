import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ApiKeyGuard } from './api-key.guard';
import { AppThrottlerGuard } from './app-throttler.guard';

const DEFAULT_RATE_LIMIT_TTL_SECONDS = 60;
const DEFAULT_RATE_LIMIT_MAX = 100;

@Global()
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const ttlSeconds = configService.get<number>(
          'RATE_LIMIT_TTL',
          DEFAULT_RATE_LIMIT_TTL_SECONDS,
        );
        const limit = configService.get<number>(
          'RATE_LIMIT_MAX',
          DEFAULT_RATE_LIMIT_MAX,
        );

        return {
          throttlers: [
            {
              ttl: Number(ttlSeconds) * 1000,
              limit: Number(limit),
            },
          ],
        };
      },
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
})
export class SecurityModule {}
