import * as JoiDefault from 'joi';
import type { ObjectSchema, Root } from 'joi';
export const Joi: Root = JoiDefault;
export type { ObjectSchema };

export function defineObjectSchema<T>(
  define: (joi: Root) => ObjectSchema<T>,
): ObjectSchema<T> {
  return define(Joi);
}
