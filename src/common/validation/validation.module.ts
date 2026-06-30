import { Global, Module } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { JoiValidationPipe } from './joi-validation.pipe';

@Global()
@Module({
  providers: [
    {
      provide: APP_PIPE,
      useClass: JoiValidationPipe,
    },
  ],
})
export class ValidationModule {}
