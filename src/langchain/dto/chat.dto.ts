import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JoiSchema } from '../../common/validation/joi-schema.decorator';
import { chatSchema } from './chat.schema';

@JoiSchema(chatSchema)
export class ChatDto {
  @ApiProperty({
    description: '用户输入的提示词',
    example: '用一句话介绍 NestJS',
  })
  prompt: string;

  @ApiPropertyOptional({
    description: '系统提示词，用于设定 AI 角色或行为',
    example: '你是一个简洁的技术助手',
  })
  systemPrompt?: string;

  @ApiPropertyOptional({
    description: '为 true 时使用 SSE 流式返回生成内容',
    example: false,
    default: false,
  })
  stream?: boolean;
}
