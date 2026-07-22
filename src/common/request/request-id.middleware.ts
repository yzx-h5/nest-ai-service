import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { RequestContextService } from './request-context.service';

export const REQUEST_ID_HEADER = 'x-request-id';
const MAX_REQUEST_ID_LENGTH = 128;

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  constructor(private readonly requestContext: RequestContextService) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const suppliedId = request.header(REQUEST_ID_HEADER)?.trim();
    const requestId =
      suppliedId && suppliedId.length <= MAX_REQUEST_ID_LENGTH
        ? suppliedId
        : randomUUID();

    response.setHeader(REQUEST_ID_HEADER, requestId);
    this.requestContext.run({ requestId }, next);
  }
}
