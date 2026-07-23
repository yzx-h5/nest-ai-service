import { defineObjectSchema } from '../../common/validation/joi';
import type { QueryKnowledgeSchemaInput } from '../../interfaces/knowledge/knowledge-dto.interface';

export const queryKnowledgeSchema = defineObjectSchema((Joi) =>
  Joi.object<QueryKnowledgeSchemaInput>({
    question: Joi.string().trim().min(1).max(2000).required().messages({
      'any.required': 'question 不能为空',
      'string.empty': 'question 不能为空',
      'string.min': 'question 不能为空',
      'string.max': 'question 长度不能超过 2000 个字符',
    }),
    stream: Joi.boolean().default(false),
  }),
);
