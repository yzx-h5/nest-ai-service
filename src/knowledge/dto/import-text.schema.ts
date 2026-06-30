import { defineObjectSchema } from '../../common/validation/joi';

interface ImportTextSchemaInput {
  text: string;
  source?: string;
}

export const importTextSchema = defineObjectSchema((Joi) =>
  Joi.object<ImportTextSchemaInput>({
    text: Joi.string().trim().min(1).max(500000).required().messages({
      'any.required': 'text 不能为空',
      'string.empty': 'text 不能为空',
      'string.min': 'text 不能为空',
      'string.max': 'text 长度不能超过 500000 个字符',
    }),
    source: Joi.string().trim().max(255).optional().messages({
      'string.max': 'source 长度不能超过 255 个字符',
    }),
  }),
);
