import { SetMetadata } from '@nestjs/common';
import { ObjectSchema } from 'joi';

export const JOI_SCHEMA_KEY = 'joiSchema';

export const JoiSchema = (schema: ObjectSchema) =>
  SetMetadata(JOI_SCHEMA_KEY, schema);
