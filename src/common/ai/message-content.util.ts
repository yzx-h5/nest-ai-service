import { AIMessageChunk } from '@langchain/core/messages';

export function extractMessageChunkText(
  content: AIMessageChunk['content'],
): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }
        if ('type' in part && part.type === 'text' && 'text' in part) {
          return String(part.text);
        }
        return '';
      })
      .join('');
  }

  return '';
}
