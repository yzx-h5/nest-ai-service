import { ApiProperty } from '@nestjs/swagger';
import { JoiSchema } from '../../common/validation/joi-schema.decorator';
import { queryKnowledgeSchema } from './query.schema';

@JoiSchema(queryKnowledgeSchema)
export class QueryKnowledgeDto {
  @ApiProperty({
    description: '基于知识库检索并回答的问题',
    example: 'NestJS 是什么？',
  })
  question: string;
}
