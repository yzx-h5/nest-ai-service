import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LangchainModule } from '../langchain/langchain.module';
import { DocumentParserService } from './document-parser.service';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';

@Module({
  imports: [ConfigModule, LangchainModule],
  controllers: [KnowledgeController],
  providers: [DocumentParserService, KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
