import { ApiProperty } from '@nestjs/swagger';
import { JoiSchema } from '../../common/validation/joi-schema.decorator';
import { importWebPageSchema } from './import-web-page.schema';

@JoiSchema(importWebPageSchema)
export class ImportWebPageDto {
  @ApiProperty({
    description: '待提取并导入知识库的公开网页地址',
    example: 'https://docs.nestjs.com/controllers',
  })
  url: string;
}
