import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerModule } from './common/logger/logger.module';
import { MetricsModule } from './common/metrics/metrics.module';
import { ResponseModule } from './common/response/response.module';
import { SecurityModule } from './common/security/security.module';
import { ValidationModule } from './common/validation/validation.module';
import { LangchainModule } from './langchain/langchain.module';
import { KnowledgeModule } from './knowledge/knowledge.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule,
    MetricsModule,
    ResponseModule,
    SecurityModule,
    ValidationModule,
    LangchainModule,
    KnowledgeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
