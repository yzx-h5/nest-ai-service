import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';

@Injectable()
export class LangchainService implements OnModuleInit {
  private model: ChatOpenAI;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.model = new ChatOpenAI({
      model: this.configService.get<string>('OPENAI_MODEL', 'gpt-4o-mini'),
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
      temperature: this.configService.get<number>('OPENAI_TEMPERATURE', 0.7),
    });
  }

  async invoke(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: BaseMessage[] = [];
    if (systemPrompt) {
      messages.push(new SystemMessage(systemPrompt));
    }
    messages.push(new HumanMessage(prompt));

    const response = await this.model.invoke(messages);
    const content = response.content;

    if (typeof content === 'string') {
      return content;
    }

    return JSON.stringify(content);
  }
}
