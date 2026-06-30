import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LangchainController } from './langchain.controller';
import { LangchainService } from './langchain.service';

@Module({
  imports: [ConfigModule],
  controllers: [LangchainController],
  providers: [LangchainService],
  exports: [LangchainService],
})
export class LangchainModule {}
