import { BadRequestException, Injectable } from '@nestjs/common';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import * as XLSX from 'xlsx';

export const SUPPORTED_DOCUMENT_EXTENSIONS = [
  '.txt',
  '.md',
  '.markdown',
  '.pdf',
  '.docx',
  '.xlsx',
  '.xls',
] as const;

export type SupportedDocumentExtension =
  (typeof SUPPORTED_DOCUMENT_EXTENSIONS)[number];

@Injectable()
export class DocumentParserService {
  getExtension(filename: string): string {
    const dotIndex = filename.lastIndexOf('.');
    if (dotIndex === -1) {
      return '';
    }
    return filename.slice(dotIndex).toLowerCase();
  }

  isSupported(filename: string): boolean {
    const extension = this.getExtension(filename);
    return SUPPORTED_DOCUMENT_EXTENSIONS.includes(
      extension as SupportedDocumentExtension,
    );
  }

  getSupportedFormatsMessage(): string {
    return '支持 .txt、.md、.pdf、.docx、.xlsx、.xls 格式';
  }

  async parse(buffer: Buffer, filename: string): Promise<string> {
    const extension = this.getExtension(filename);

    if (
      !SUPPORTED_DOCUMENT_EXTENSIONS.includes(
        extension as SupportedDocumentExtension,
      )
    ) {
      throw new BadRequestException(this.getSupportedFormatsMessage());
    }

    let text: string;

    switch (extension) {
      case '.txt':
      case '.md':
      case '.markdown':
        text = this.parsePlainText(buffer);
        break;
      case '.pdf':
        text = await this.parsePdf(buffer);
        break;
      case '.docx':
        text = await this.parseDocx(buffer);
        break;
      case '.xlsx':
      case '.xls':
        text = this.parseExcel(buffer);
        break;
      default:
        throw new BadRequestException(this.getSupportedFormatsMessage());
    }

    const normalized = this.normalizeExtractedText(text);
    if (!normalized) {
      throw new BadRequestException('未能从文件中提取到有效文本');
    }

    return normalized;
  }

  /**
   * 清洗抽取文本：去空字符、页码行、跨页重复页眉页脚，减少无意义切片。
   */
  normalizeExtractedText(text: string): string {
    const cleaned = text.split('\0').join('').replace(/\r\n/g, '\n');
    const withoutPageMarkers = cleaned.replace(
      /^[ \t]*(?:--\s*)?(?:Page\s+)?\d+\s*(?:of|\/)\s*\d+(?:\s*--)?[ \t]*$/gim,
      '',
    );

    const lines = withoutPageMarkers.split('\n');
    const shortLineCounts = new Map<string, number>();
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 0 && trimmed.length <= 120) {
        shortLineCounts.set(
          trimmed,
          (shortLineCounts.get(trimmed) ?? 0) + 1,
        );
      }
    }

    // 短行重复出现多次，通常是页眉/页脚/水印
    const boilerplate = new Set(
      [...shortLineCounts.entries()]
        .filter(([, count]) => count >= 5)
        .map(([line]) => line),
    );

    const filtered = lines.filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return true;
      }
      return !boilerplate.has(trimmed);
    });

    return filtered.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  private parsePlainText(buffer: Buffer): string {
    return buffer.toString('utf-8');
  }

  private async parsePdf(buffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } catch {
      throw new BadRequestException(
        'PDF 文件解析失败，请确认文件未损坏且未加密',
      );
    } finally {
      await parser.destroy();
    }
  }

  private async parseDocx(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch {
      throw new BadRequestException(
        'Word 文件解析失败，请确认文件为 .docx 格式且未损坏',
      );
    }
  }

  private parseExcel(buffer: Buffer): string {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sections: string[] = [];

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet).trim();
        if (csv) {
          sections.push(`[Sheet: ${sheetName}]\n${csv}`);
        }
      }

      return sections.join('\n\n');
    } catch {
      throw new BadRequestException('Excel 文件解析失败，请确认文件未损坏');
    }
  }
}
