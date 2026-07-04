import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';

/** 标记接口无需登录（登录、签署端等） */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** 所需权限码（按钮/菜单级），全部满足才放行 */
export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...codes: string[]) =>
  SetMetadata(PERMISSIONS_KEY, codes);

/** 所需角色码 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export interface JwtPayload {
  sub: string; // userId
  username: string;
  roleCode: string;
  permissions: string[];
  jti: string; // Redis 白名单键
}

/** 注入当前登录用户 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as JwtPayload;
    return data ? user?.[data] : user;
  },
);
