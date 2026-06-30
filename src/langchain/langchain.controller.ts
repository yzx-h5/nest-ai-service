import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiOkResponseWrapped } from '../common/response/api-response.dto';
import { ChatDto } from './dto/chat.dto';
import { ChatResponseDto } from './dto/chat-response.dto';
import { LangchainService } from './langchain.service';

@ApiTags('AI')
@Controller('ai')
export class LangchainController {
  constructor(private readonly langchainService: LangchainService) {}

  @Post('chat')
  @ApiOperation({ summary: '调用 OpenAI 进行对话' })
  @ApiOkResponseWrapped(ChatResponseDto, '对话成功')
  async chat(@Body() body: ChatDto): Promise<ChatResponseDto> {
    const content = await this.langchainService.invoke(
      body.prompt,
      body.systemPrompt,
    );
    return { content };
  }
}
