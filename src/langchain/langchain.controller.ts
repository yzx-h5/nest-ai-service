import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiOkResponseWrapped } from '../common/response/api-response.dto';
import { runSseStream } from '../common/streaming/sse.util';
import { API_KEY_SECURITY_NAME } from '../common/security/security.constants';
import { ChatDto } from './dto/chat.dto';
import { ChatResponseDto } from './dto/chat-response.dto';
import { LangchainService } from './langchain.service';

@ApiTags('AI')
@ApiSecurity(API_KEY_SECURITY_NAME)
@Controller('ai')
export class LangchainController {
  constructor(private readonly langchainService: LangchainService) {}

  @Post('chat')
  @ApiOperation({
    summary: '调用 LLM 进行对话',
    description:
      'stream 为 true 时返回 text/event-stream，事件类型：step / token / result / error',
  })
  @ApiOkResponseWrapped(ChatResponseDto, '对话成功')
  async chat(
    @Body() body: ChatDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ChatResponseDto | void> {
    if (body.stream) {
      await runSseStream(res, async (emit) => {
        emit({
          type: 'step',
          step: 'generating',
          message: '正在生成回答...',
        });

        let content = '';
        for await (const token of this.langchainService.stream(
          body.prompt,
          body.systemPrompt,
        )) {
          content += token;
          emit({ type: 'token', content: token });
        }

        emit({
          type: 'result',
          data: { content },
        });
      });
      return;
    }

    const content = await this.langchainService.invoke(
      body.prompt,
      body.systemPrompt,
    );
    return { content };
  }
}
