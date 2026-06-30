import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiOkResponseWrapped } from '../common/response/api-response.dto';
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
  @ApiOperation({ summary: '调用 LLM 进行对话' })
  @ApiOkResponseWrapped(ChatResponseDto, '对话成功')
  async chat(@Body() body: ChatDto): Promise<ChatResponseDto> {
    const content = await this.langchainService.invoke(
      body.prompt,
      body.systemPrompt,
    );
    return { content };
  }
}
