import { defineObjectSchema } from '../../common/validation/joi';
import type { ListDocumentsSchemaInput } from '../../interfaces/knowledge/knowledge-dto.interface';

export const listDocumentsSchema = defineObjectSchema((Joi) =>
  Joi.object<ListDocumentsSchemaInput>({
    page: Joi.number().integer().min(1).default(1).messages({
      'number.min': 'page 必须大于等于 1',
    }),
    pageSize: Joi.number().integer().min(1).max(100).default(20).messages({
      'number.min': 'pageSize 必须大于等于 1',
      'number.max': 'pageSize 不能超过 100',
    }),
    source: Joi.string().trim().max(255).optional().messages({
      'string.max': 'source 长度不能超过 255 个字符',
    }),
  }),
);
