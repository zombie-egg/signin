import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'node:crypto';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';
import { BizException } from '../../common/exceptions/biz.exception';
import { ErrorCode } from '../../common/constants/error-code';
import { JwtPayload } from '../../common/decorators';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** 登录：校验密码、失败锁定、签发双 token、写 Redis 白名单（单点登录） */
  async login(username: string, password: string, ip: string) {
    const user = await this.prisma.user.findFirst({
      where: { username },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    if (!user) throw new BizException(ErrorCode.BAD_CREDENTIALS);
    if (user.status === 0) throw new BizException(ErrorCode.ACCOUNT_DISABLED);

    // 锁定校验
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new BizException(ErrorCode.ACCOUNT_LOCKED);
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      await this.onLoginFail(user.id, user.failCount);
      throw new BizException(ErrorCode.BAD_CREDENTIALS);
    }

    // 成功：重置失败计数、记录登录
    const permissions = user.role.permissions.map((rp) => rp.permission.code);
    const jti = crypto.randomUUID();
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      roleCode: user.role.code,
      permissions,
      jti,
    };

    const accessTtl = this.config.get<number>('app.jwt.accessTtl')!;
    const refreshTtl = this.config.get<number>('app.jwt.refreshTtl')!;

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('app.jwt.accessSecret'),
      expiresIn: accessTtl,
    });
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, jti },
      { secret: this.config.get<string>('app.jwt.refreshSecret'), expiresIn: refreshTtl },
    );

    // 单点登录：清旧白名单，写新 jti（refresh TTL 为准，覆盖 access 生命周期）
    await this.clearUserTokens(user.id);
    await this.redis.set(RedisService.tokenKey(user.id, jti), '1', refreshTtl);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: { operatorId: user.id, operatorName: user.username, action: 'LOGIN', ip },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTtl,
      user: {
        id: user.id,
        username: user.username,
        realName: user.realName,
        roleCode: user.role.code,
        permissions,
      },
    };
  }

  /** 刷新 access token（沿用同一 jti，保持单点登录约束） */
  async refresh(refreshToken: string) {
    let decoded: { sub: string; jti: string };
    try {
      decoded = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get<string>('app.jwt.refreshSecret'),
      });
    } catch {
      throw new BizException(ErrorCode.REFRESH_INVALID);
    }

    const active = await this.redis.get(
      RedisService.tokenKey(decoded.sub, decoded.jti),
    );
    if (!active) throw new BizException(ErrorCode.REFRESH_INVALID);

    const user = await this.prisma.user.findFirst({
      where: { id: decoded.sub },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    if (!user || user.status === 0) throw new BizException(ErrorCode.ACCOUNT_DISABLED);

    const permissions = user.role.permissions.map((rp) => rp.permission.code);
    const accessTtl = this.config.get<number>('app.jwt.accessTtl')!;
    const accessToken = await this.jwt.signAsync(
      {
        sub: user.id,
        username: user.username,
        roleCode: user.role.code,
        permissions,
        jti: decoded.jti,
      } as JwtPayload,
      { secret: this.config.get<string>('app.jwt.accessSecret'), expiresIn: accessTtl },
    );
    return { accessToken, expiresIn: accessTtl };
  }

  async logout(userId: string, jti: string): Promise<void> {
    await this.redis.del(RedisService.tokenKey(userId, jti));
  }

  /** 修改自己的密码：校验旧密码 -> 更新 -> 清所有登录态(需重新登录) */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    if (!user) throw new BizException(ErrorCode.UNAUTHORIZED);
    const ok = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!ok) throw new BizException(ErrorCode.BAD_CREDENTIALS, '原密码错误');
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(newPassword, 10) },
    });
    await this.clearUserTokens(userId);
    await this.prisma.auditLog.create({
      data: {
        operatorId: userId,
        operatorName: user.username,
        action: 'CHANGE_PASSWORD',
        targetType: 'user',
        targetId: userId,
      },
    });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    if (!user) throw new BizException(ErrorCode.UNAUTHORIZED);
    return {
      id: user.id,
      username: user.username,
      realName: user.realName,
      roleCode: user.role.code,
      permissions: user.role.permissions.map((rp) => rp.permission.code),
    };
  }

  private async onLoginFail(userId: string, currentFail: number): Promise<void> {
    const max = this.config.get<number>('app.security.loginMaxFail')!;
    const lockMin = this.config.get<number>('app.security.loginLockMinutes')!;
    const next = currentFail + 1;
    const data: { failCount: number; lockedUntil?: Date } = { failCount: next };
    if (next >= max) {
      data.lockedUntil = new Date(Date.now() + lockMin * 60_000);
      data.failCount = 0;
    }
    await this.prisma.user.update({ where: { id: userId }, data });
  }

  /** 清除某用户所有登录态（单点登录/禁用踢下线） */
  private async clearUserTokens(userId: string): Promise<void> {
    const client = this.redis.getClient();
    const keys = await client.keys(RedisService.tokenKey(userId, '*'));
    if (keys.length) await client.del(...keys);
  }
}
