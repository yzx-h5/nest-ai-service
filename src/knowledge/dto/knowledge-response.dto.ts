import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImportDocumentResponseDto {
  @ApiProperty({ description: '写入向量库的文本块数量', example: 3 })
  chunksAdded: number;

  @ApiProperty({
    description: '因过短/页码等被跳过的切片数量',
    example: 2,
  })
  chunksSkipped: number;

  @ApiProperty({
    description: '解析后写入切分前的字符数（可用于核对是否抽全）',
    example: 12000,
  })
  charsExtracted: number;

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

export class KnowledgeChunkItemDto {
  @ApiProperty({
    description: '知识库片段 id',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  id: string;

  @ApiProperty({ description: '文本片段内容' })
  content: string;

  @ApiPropertyOptional({
    description: '文档来源标识',
    example: 'nestjs-intro.txt',
  })
  source?: string;

  @ApiPropertyOptional({ description: '文件类型', example: 'pdf' })
  fileType?: string;

  @ApiPropertyOptional({
    description: '导入时间',
    example: '2026-07-01T10:00:00.000Z',
  })
  importedAt?: string;

  @ApiProperty({
    description: '片段元数据',
    example: { source: 'nestjs-intro.txt' },
  })
  metadata: Record<string, unknown>;
}

export class ListKnowledgeDocumentsResponseDto {
  @ApiProperty({
    description: '知识库片段列表',
    type: [KnowledgeChunkItemDto],
  })
  items: KnowledgeChunkItemDto[];

  @ApiProperty({ description: '符合条件的总条数', example: 42 })
  total: number;

  @ApiProperty({ description: '当前页码', example: 1 })
  page: number;

  @ApiProperty({ description: '每页条数', example: 20 })
  pageSize: number;

  @ApiProperty({ description: '总页数', example: 3 })
  totalPages: number;
}

export class DeleteKnowledgeDocumentsResponseDto {
  @ApiProperty({ description: '已删除的片段数量', example: 4 })
  deletedCount: number;
}
