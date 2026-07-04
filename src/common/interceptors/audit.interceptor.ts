import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { Prisma } from '@prisma/client';
import { SetMetadata } from '@nestjs/common';
import { JwtPayload } from '../decorators';
import { PrismaService } from '../../infra/prisma/prisma.service';

export const AUDIT_KEY = 'audit';
export interface AuditMeta {
  action: string;
  targetType?: string;
}
/** 标记敏感操作，成功后落审计日志。用法：@Audit({ action: 'CONTRACT_DELETE', targetType: 'contract' }) */
export const Audit = (meta: AuditMeta) => SetMetadata(AUDIT_KEY, meta);

/** 敏感操作审计拦截：仅在处理成功后写库，失败不记录（异常由 filter 处理） */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditMeta>(AUDIT_KEY, context.getHandler());
    if (!meta) return next.handle();

    const req = context.switchToHttp().getRequest<Request>();
    const user = (req as Request & { user?: JwtPayload }).user;
    const ip = this.clientIp(req);
    const ua = req.headers['user-agent'] ?? undefined;

    return next.handle().pipe(
      tap((result) => {
        void this.prisma.auditLog.create({
          data: {
            operatorId: user?.sub,
            operatorName: user?.username,
            action: meta.action,
            targetType: meta.targetType,
            targetId: (req.params?.id as string) ?? undefined,
            detail: {
              method: req.method,
              path: req.originalUrl,
              body: this.sanitize(req.body),
              resultId:
                result && typeof result === 'object' && 'id' in result
                  ? (result as { id: string }).id
                  : undefined,
            } as unknown as Prisma.InputJsonValue,
            ip,
            userAgent: ua,
          },
        });
      }),
    );
  }

  private clientIp(req: Request): string {
    const xf = req.headers['x-forwarded-for'];
    if (typeof xf === 'string') return xf.split(',')[0].trim();
    return req.ip ?? req.socket.remoteAddress ?? '';
  }

  /** 脱敏，避免把密码等写入日志 */
  private sanitize(body: unknown): unknown {
    if (!body || typeof body !== 'object') return body;
    const clone: Record<string, unknown> = { ...(body as Record<string, unknown>) };
    for (const k of ['password', 'newPassword', 'oldPassword']) {
      if (k in clone) clone[k] = '***';
    }
    return clone;
  }
}
