import * as crypto from 'node:crypto';

/** 计算 MD5（文件去重） */
export function md5(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

/** 计算 SHA256（防篡改） */
export function sha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/** 校验 PDF magic number */
export function isPdfMagic(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
}

/** 校验 PNG magic number（透明公章要求 PNG） */
export function isPngMagic(buffer: Buffer): boolean {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return buffer.subarray(0, 8).equals(sig);
}

/** 校验 PNG 或 JPEG（签署端个人印章/签名） */
export function isImageMagic(buffer: Buffer): boolean {
  if (isPngMagic(buffer)) return true;
  // JPEG: FF D8 FF
  return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

/** 一次性签署链接 token（64 hex） */
export function genLinkToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** 支持的合同文件类型：MIME -> 扩展名 */
export const CONTRACT_MIME_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/tiff': '.tiff',
  'text/plain': '.txt',
};

/** 从原始文件名取扩展名（含点，小写） */
export function extname(filename: string): string {
  const i = filename.lastIndexOf('.');
  return i >= 0 ? filename.slice(i).toLowerCase() : '';
}

/** 是否 PDF（仅 PDF 支持在线盖章/签名叠加） */
export function isPdfContract(mime?: string | null, ext?: string | null): boolean {
  return mime === 'application/pdf' || ext === '.pdf';
}
