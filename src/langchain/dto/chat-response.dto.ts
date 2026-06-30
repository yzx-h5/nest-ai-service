import { ApiProperty } from '@nestjs/swagger';

export class ChatResponseDto {
  @ApiProperty({
    description: 'AI 返回的文本内容',
    example: 'NestJS 是一个用于构建高效、可扩展 Node.js 服务端应用的框架。',
  })
  content: string;
}
