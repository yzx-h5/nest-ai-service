import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from '@nestjs/swagger';

export class ApiResponseDto<T = unknown> {
  @ApiProperty({ description: '业务状态码', example: 0 })
  code: number;

  @ApiProperty({ description: '响应消息', example: 'success' })
  message: string;

  @ApiProperty({ description: '响应数据' })
  data: T;

  @ApiPropertyOptional({ description: '请求关联 ID，仅错误响应返回' })
  requestId?: string;
}

export function ApiOkResponseWrapped<T>(
  dataType: Type<T>,
  description = '请求成功',
) {
  return applyDecorators(
    ApiExtraModels(ApiResponseDto, dataType),
    ApiOkResponse({
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseDto) },
          {
            properties: {
              data: { $ref: getSchemaPath(dataType) },
            },
          },
        ],
      },
    }),
  );
}
