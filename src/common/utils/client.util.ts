import { Request } from 'express';

/** 取真实客户端 IP（兼容反向代理） */
export function getClientIp(req: Request): string {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length) return xf.split(',')[0].trim();
  return req.ip ?? req.socket.remoteAddress ?? '';
}
