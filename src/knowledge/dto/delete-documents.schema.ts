import { defineObjectSchema } from '../../common/validation/joi';
import type {
  DeleteDocumentParamSchemaInput,
  DeleteDocumentsBySourceSchemaInput,
} from '../../interfaces/knowledge/knowledge-dto.interface';

export const deleteDocumentsBySourceSchema = defineObjectSchema((Joi) =>
  Joi.object<DeleteDocumentsBySourceSchemaInput>({
    source: Joi.string().trim().min(1).max(255).required().messages({
      'any.required': 'source 不能为空',
      'string.empty': 'source 不能为空',
      'string.min': 'source 不能为空',
      'string.max': 'source 长度不能超过 255 个字符',
    }),
  }),
);

export const deleteDocumentParamSchema = defineObjectSchema((Joi) =>
  Joi.object<DeleteDocumentParamSchemaInput>({
    id: Joi.string().trim().min(1).max(128).required().messages({
      'any.required': 'id 不能为空',
      'string.empty': 'id 不能为空',
      'string.min': 'id 不能为空',
      'string.max': 'id 长度不能超过 128 个字符',
    }),
  }),
);
