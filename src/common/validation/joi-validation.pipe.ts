import {
  ArgumentMetadata,
  Injectable,
  PipeTransform,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ObjectSchema } from './joi';
import { JOI_SCHEMA_KEY } from './joi-schema.decorator';

const JOI_VALIDATE_OPTIONS = {
  abortEarly: false,
  stripUnknown: true,
  convert: true,
} as const;

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.trim().replace(/\0/g, '');
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (
    value !== null &&
    typeof value === 'object' &&
    !Buffer.isBuffer(value) &&
    !(value instanceof Date)
  ) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, sanitizeValue(entry)]),
    );
  }

  return value;
}

@Injectable()
export class JoiValidationPipe implements PipeTransform {
  constructor(private readonly reflector: Reflector) {}

  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (!this.shouldValidate(metadata)) {
      return value;
    }

    if (!metadata.metatype) {
      return value;
    }

    const schema = this.reflector.get<ObjectSchema | undefined>(
      JOI_SCHEMA_KEY,
      metadata.metatype,
    );

    if (!schema) {
      return value;
    }

    const result = schema.validate(value, JOI_VALIDATE_OPTIONS);

    if (result.error) {
      throw new UnprocessableEntityException(
        result.error.details.map((detail) => detail.message).join('; '),
      );
    }

    return sanitizeValue(result.value);
  }

  private shouldValidate(metadata: ArgumentMetadata): boolean {
    return ['body', 'query', 'param', 'custom'].includes(metadata.type ?? '');
  }
}
