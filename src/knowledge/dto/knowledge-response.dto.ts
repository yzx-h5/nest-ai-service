import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImportDocumentResponseDto {
  @ApiProperty({ description: '写入向量库的文本块数量', example: 3 })
  chunksAdded: number;

  @ApiPropertyOptional({
    description: '文档来源标识',
    example: 'nestjs-intro.txt',
  })
  source?: string;
}

export class KnowledgeSourceResponseDto {
  @ApiProperty({ description: '检索到的文本片段' })
  content: string;

  @ApiProperty({ description: '相似度分数（越高越相关）', example: 0.82 })
  score: number;

  @ApiProperty({
    description: '片段元数据',
    example: { source: 'nestjs-intro.txt' },
  })
  metadata: Record<string, unknown>;
}

export class QueryKnowledgeResponseDto {
  @ApiProperty({ description: '基于知识库生成的回答' })
  answer: string;

  @ApiProperty({
    description: '检索到的参考片段',
    type: [KnowledgeSourceResponseDto],
  })
  sources: KnowledgeSourceResponseDto[];
}
