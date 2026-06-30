import { defineObjectSchema } from '../../common/validation/joi';

interface ChatSchemaInput {
  prompt: string;
  systemPrompt?: string;
}

export const chatSchema = defineObjectSchema((Joi) =>
  Joi.object<ChatSchemaInput>({
    prompt: Joi.string().trim().min(1).max(10000).required().messages({
      'any.required': 'prompt 不能为空',
      'string.empty': 'prompt 不能为空',
      'string.min': 'prompt 不能为空',
      'string.max': 'prompt 长度不能超过 10000 个字符',
    }),
    systemPrompt: Joi.string().trim().max(5000).optional().messages({
      'string.max': 'systemPrompt 长度不能超过 5000 个字符',
    }),
  }),
);
