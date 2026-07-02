import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { rethrowAiProviderError } from '../common/ai/ai-provider-error';
import { extractMessageChunkText } from '../common/ai/message-content.util';
import { buildOpenAiClientConfig } from '../common/ai/llm-config';

@Injectable()
export class LangchainService implements OnModuleInit {
  private model: ChatOpenAI;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.model = new ChatOpenAI({
      model: this.configService.get<string>('OPENAI_MODEL'),
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
      configuration: buildOpenAiClientConfig(this.configService, 'llm'),
      temperature: Number(
        this.configService.get<string>('OPENAI_TEMPERATURE', '0.7'),
      ),
    });
  }

  async invoke(prompt: string, systemPrompt?: string): Promise<string> {
    const messages = this.buildMessages(prompt, systemPrompt);

    try {
      const response = await this.model.invoke(messages);
      const content = response.content;

      if (typeof content === 'string') {
        return content;
      }

      return JSON.stringify(content);
    } catch (error) {
      rethrowAiProviderError(error);
    }
  }

  async *stream(
    prompt: string,
    systemPrompt?: string,
  ): AsyncGenerator<string, string, void> {
    const messages = this.buildMessages(prompt, systemPrompt);

    try {
      const stream = await this.model.stream(messages);
      let answer = '';

      for await (const chunk of stream) {
        const text = extractMessageChunkText(chunk.content);
        if (text) {
          answer += text;
          yield text;
        }
      }

      return answer;
    } catch (error) {
      rethrowAiProviderError(error);
    }
  }

  private buildMessages(prompt: string, systemPrompt?: string): BaseMessage[] {
    const messages: BaseMessage[] = [];
    if (systemPrompt) {
      messages.push(new SystemMessage(systemPrompt));
    }
    messages.push(new HumanMessage(prompt));
    return messages;
  }
}
