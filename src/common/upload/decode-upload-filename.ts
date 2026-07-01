/**
 * 修复 multipart 上传时中文等非 ASCII 文件名的乱码。
 *
 * 浏览器通常以 UTF-8 发送文件名，但 Multer/Busboy 默认按 latin1 解析 `originalname`，
 * 导致「杨志鑫.pdf」变成「æ¥å¿é«.pdf」这类 mojibake。
 */
export function decodeUploadFilename(filename: string): string {
  if (/[\u3400-\u9fff]/.test(filename)) {
    return filename;
  }

  const decoded = Buffer.from(filename, 'latin1').toString('utf8');
  if (/[\u3400-\u9fff]/.test(decoded) && !decoded.includes('\uFFFD')) {
    return decoded;
  }

  return filename;
}
