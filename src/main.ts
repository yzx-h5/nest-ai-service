import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppLoggerService } from './common/logger/logger.service';
import {
  API_KEY_HEADER,
  API_KEY_SECURITY_NAME,
} from './common/security/security.constants';

function resolveCorsOptions(configService: ConfigService) {
  const enabled = configService.get<string>('CORS_ENABLED', 'true') !== 'false';
  if (!enabled) {
    return false as const;
  }

  const originValue = configService.get<string>('CORS_ORIGIN', '*').trim();
  if (originValue === '' || originValue === '*') {
    return { origin: true, credentials: false };
  }

  const origins = originValue
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  return { origin: origins, credentials: true };
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const logger = await app.resolve(AppLoggerService);
  logger.setContext('Bootstrap');
  app.useLogger(logger);

  const configService = app.get(ConfigService);

  // 安全 HTTP 头。放宽 CSP 以便 Swagger UI 正常加载内联脚本/样式。
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          scriptSrc: [`'self'`, `'unsafe-inline'`],
          styleSrc: [`'self'`, `'unsafe-inline'`],
          imgSrc: [`'self'`, 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  const corsOptions = resolveCorsOptions(configService);
  if (corsOptions !== false) {
    app.enableCors(corsOptions);
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Nest AI Service')
    .setDescription('基于 NestJS 与 LangChain 的 AI 服务 API')
    .setVersion('1.0')
    .addApiKey(
      { type: 'apiKey', name: API_KEY_HEADER, in: 'header' },
      API_KEY_SECURITY_NAME,
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  const publicPath = [
    join(process.cwd(), 'public'),
    join(__dirname, 'public'),
  ].find((path) => existsSync(path));
  if (publicPath) {
    app.useStaticAssets(publicPath, { prefix: '/demo' });
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application is running on port ${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/api`);
  if (publicPath) {
    logger.log(`Demo UI: http://localhost:${port}/demo/`);
  }
  logger.log(`Prometheus metrics: http://localhost:${port}/metrics`);
}
void bootstrap();
