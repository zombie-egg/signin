import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY, JwtPayload } from '../decorators';
import { BizException } from '../exceptions/biz.exception';
import { ErrorCode } from '../constants/error-code';
import { RedisService } from '../../infra/redis/redis.service';

/**
 * 登录态校验：验证 access token 签名 + Redis 白名单(单点登录/主动踢下线)。
 * @Public 接口跳过。
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(req);
    if (!token) throw new BizException(ErrorCode.UNAUTHORIZED);

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.get<string>('app.jwt.accessSecret'),
      });
    } catch {
      throw new BizException(ErrorCode.UNAUTHORIZED);
    }

    // 白名单校验：单点登录，登出/被踢后 jti 失效
    const active = await this.redis.get(RedisService.tokenKey(payload.sub, payload.jti));
    if (!active) throw new BizException(ErrorCode.UNAUTHORIZED);

    (req as Request & { user: JwtPayload }).user = payload;
    return true;
  }

  private extractToken(req: Request): string | null {
    const auth = req.headers.authorization;
    if (!auth) return null;
    const [type, token] = auth.split(' ');
    return type === 'Bearer' && token ? token : null;
  }
}
