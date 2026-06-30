import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JoiSchema } from '../../common/validation/joi-schema.decorator';
import { importTextSchema } from './import-text.schema';

@JoiSchema(importTextSchema)
export class ImportTextDto {
  @ApiProperty({
    description: '要导入的文本内容',
    example: 'NestJS 是一个用于构建 Node.js 服务端应用的框架。',
  })
  text: string;

  @ApiPropertyOptional({
    description: '文档来源标识，便于检索时追溯',
    example: 'nestjs-intro.txt',
  })
  source?: string;
}
