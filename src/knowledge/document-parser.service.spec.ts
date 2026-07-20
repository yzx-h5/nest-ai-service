import * as XLSX from 'xlsx';
import { DocumentParserService } from './document-parser.service';

describe('DocumentParserService', () => {
  const service = new DocumentParserService();

  it('should parse plain text', async () => {
    const buffer = Buffer.from('hello world', 'utf-8');
    const text = await service.parse(buffer, 'note.txt');
    expect(text).toBe('hello world');
  });

  it('should parse excel workbook', async () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ['Name', 'Role'],
      ['Alice', 'Engineer'],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Team');
    const buffer = Buffer.from(
      XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as ArrayBuffer,
    );

    const text = await service.parse(buffer, 'team.xlsx');

    expect(text).toContain('[Sheet: Team]');
    expect(text).toContain('Alice');
    expect(text).toContain('Engineer');
  });

  it('should reject unsupported extensions', async () => {
    await expect(
      service.parse(Buffer.from('data'), 'archive.zip'),
    ).rejects.toThrow('支持 .txt、.md、.pdf、.docx、.xlsx、.xls 格式');
  });

  it('should strip page markers and repeated footers', () => {
    const pages = Array.from({ length: 6 }, (_, i) =>
      [
        `Section content on page ${i + 1}`,
        'Celebrate living TM',
        'fwdprivate.com',
        `-- ${i + 1} of 6 --`,
      ].join('\n'),
    ).join('\n\n');

    const normalized = service.normalizeExtractedText(pages);

    expect(normalized).toContain('Section content on page 1');
    expect(normalized).not.toContain('Celebrate living TM');
    expect(normalized).not.toContain('fwdprivate.com');
    expect(normalized).not.toMatch(/--\s*\d+\s*of\s*\d+\s*--/);
  });
});
