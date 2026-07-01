import { decodeUploadFilename } from './decode-upload-filename';

describe('decodeUploadFilename', () => {
  it('should decode latin1-misread UTF-8 filenames', () => {
    const mojibake = Buffer.from('杨志鑫-前端开发-4年.pdf', 'utf8').toString(
      'latin1',
    );

    expect(decodeUploadFilename(mojibake)).toBe('杨志鑫-前端开发-4年.pdf');
  });

  it('should keep already-correct UTF-8 filenames', () => {
    expect(decodeUploadFilename('杨志鑫-前端开发-4年.pdf')).toBe(
      '杨志鑫-前端开发-4年.pdf',
    );
  });

  it('should keep ASCII filenames unchanged', () => {
    expect(decodeUploadFilename('resume.pdf')).toBe('resume.pdf');
  });
});
