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
});
