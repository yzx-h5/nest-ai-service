import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JoiSchema } from '../../common/validation/joi-schema.decorator';
import { queryKnowledgeSchema } from './query.schema';

@JoiSchema(queryKnowledgeSchema)
export class QueryKnowledgeDto {
  @ApiProperty({
    description: '基于知识库检索并回答的问题',
    example: 'NestJS 是什么？',
  })
  question: string;

  @ApiPropertyOptional({
    description:
      '为 true 时使用 SSE 流式返回，并推送检索/生成等步骤进度',
    example: false,
    default: false,
  })
  stream?: boolean;
}
