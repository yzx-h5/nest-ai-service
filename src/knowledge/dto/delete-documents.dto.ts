import { ApiProperty } from '@nestjs/swagger';
import { JoiSchema } from '../../common/validation/joi-schema.decorator';
import {
  deleteDocumentParamSchema,
  deleteDocumentsBySourceSchema,
} from './delete-documents.schema';

@JoiSchema(deleteDocumentsBySourceSchema)
export class DeleteDocumentsBySourceDto {
  @ApiProperty({
    description: '要删除的文档来源标识（将删除该文档的所有切片）',
    example: 'nestjs-intro.txt',
  })
  source: string;
}

@JoiSchema(deleteDocumentParamSchema)
export class DeleteDocumentParamDto {
  @ApiProperty({
    description: '知识库片段 id',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  id: string;
}
