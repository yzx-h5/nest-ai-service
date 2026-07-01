import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JoiSchema } from '../../common/validation/joi-schema.decorator';
import { listDocumentsSchema } from './list-documents.schema';

@JoiSchema(listDocumentsSchema)
export class ListDocumentsDto {
  @ApiPropertyOptional({ description: '页码，从 1 开始', example: 1, default: 1 })
  page: number;

  @ApiPropertyOptional({
    description: '每页条数',
    example: 20,
    default: 20,
    maximum: 100,
  })
  pageSize: number;

  @ApiPropertyOptional({
    description: '按文档来源过滤',
    example: 'nestjs-intro.txt',
  })
  source?: string;
}
