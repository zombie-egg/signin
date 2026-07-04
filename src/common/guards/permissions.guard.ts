import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import {
  JwtPayload,
  PERMISSIONS_KEY,
  ROLES_KEY,
} from '../decorators';
import { BizException } from '../exceptions/biz.exception';
import { ErrorCode } from '../constants/error-code';

const SUPER_ADMIN = 'SUPER_ADMIN';

/** RBAC：校验角色 + 按钮/菜单级权限码。超管放行一切 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredPerms = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (
      (!requiredRoles || requiredRoles.length === 0) &&
      (!requiredPerms || requiredPerms.length === 0)
    ) {
      return true; // 仅需登录
    }

    const req = context.switchToHttp().getRequest<Request>();
    const user = (req as Request & { user?: JwtPayload }).user;
    if (!user) throw new BizException(ErrorCode.UNAUTHORIZED);

    if (user.roleCode === SUPER_ADMIN) return true;

    if (requiredRoles?.length && !requiredRoles.includes(user.roleCode)) {
      throw new BizException(ErrorCode.FORBIDDEN);
    }

    if (requiredPerms?.length) {
      const owned = new Set(user.permissions ?? []);
      const ok = requiredPerms.every((p) => owned.has(p));
      if (!ok) throw new BizException(ErrorCode.NO_BUTTON_PERMISSION);
    }

    return true;
  }
}
