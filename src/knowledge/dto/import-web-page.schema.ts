import { defineObjectSchema } from '../../common/validation/joi';
import type { ImportWebPageSchemaInput } from '../../interfaces/knowledge/knowledge-dto.interface';

export const importWebPageSchema = defineObjectSchema((Joi) =>
  Joi.object<ImportWebPageSchemaInput>({
    url: Joi.string()
      .trim()
      .uri({ scheme: ['http', 'https'] })
      .max(2048)
      .required()
      .messages({
        'any.required': '请传入 url',
        'string.uri': 'url 必须是有效的 http 或 https 地址',
        'string.max': 'url 不能超过 2048 个字符',
      }),
  }).required(),
);
