import {
  ArgumentMetadata,
  Injectable,
  PipeTransform,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ObjectSchema } from './joi';
import { JOI_SCHEMA_KEY } from './joi-schema.decorator';

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

    const result = schema.validate(value, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (result.error) {
      throw new UnprocessableEntityException(
        result.error.details.map((detail) => detail.message).join('; '),
      );
    }

    return result.value;
  }

  private shouldValidate(metadata: ArgumentMetadata): boolean {
    return ['body', 'query', 'param'].includes(metadata.type ?? '');
  }
}
