import { HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

export function setupSseResponse(res: Response): void {
  res.status(HttpStatus.OK);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

export function writeSseEvent(res: Response, payload: unknown): void {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export function endSseResponse(res: Response): void {
  res.end();
}

export function resolveStreamErrorMessage(error: unknown): string {
  if (error instanceof HttpException) {
    const response = error.getResponse();
    if (typeof response === 'string') {
      return response;
    }
    if (
      typeof response === 'object' &&
      response !== null &&
      'message' in response
    ) {
      const message = (response as { message?: string | string[] }).message;
      if (Array.isArray(message)) {
        return message.join('; ');
      }
      if (typeof message === 'string') {
        return message;
      }
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return '流式请求处理失败';
}

export async function runSseStream(
  res: Response,
  handler: (emit: (payload: unknown) => void) => Promise<void>,
): Promise<void> {
  setupSseResponse(res);

  try {
    await handler((payload) => writeSseEvent(res, payload));
  } catch (error) {
    writeSseEvent(res, {
      type: 'error',
      message: resolveStreamErrorMessage(error),
    });
  } finally {
    endSseResponse(res);
  }
}
