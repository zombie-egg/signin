import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';
import { BizException } from '../../common/exceptions/biz.exception';
import { ErrorCode } from '../../common/constants/error-code';
import { PageResult, pageResult } from '../../common/dto/pagination.dto';
import {
  CreateUserDto,
  ListUserDto,
  UpdateUserDto,
  UpdateUserStatusDto,
} from './dto/user.dto';

const SUPER_ADMIN = 'SUPER_ADMIN';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async list(dto: ListUserDto): Promise<PageResult<unknown>> {
    const where: Record<string, unknown> = {};
    if (dto.username) where.username = { contains: dto.username };
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: dto.skip,
        take: dto.take,
        include: { role: { select: { code: true, name: true } } },
      }),
      this.prisma.user.count({ where }),
    ]);
    const list = rows.map((u) => ({
      id: u.id,
      username: u.username,
      realName: u.realName,
      roleCode: u.role.code,
      roleName: u.role.name,
      status: u.status,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    }));
    return pageResult(list, total, dto);
  }

  async create(dto: CreateUserDto) {
    const dup = await this.prisma.user.findFirst({
      where: { username: dto.username },
    });
    if (dup) throw new BizException(ErrorCode.USERNAME_EXISTS);
    const role = await this.prisma.role.findFirst({ where: { id: dto.roleId } });
    if (!role) throw new BizException(ErrorCode.ROLE_NOT_FOUND);

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        passwordHash: await bcrypt.hash(dto.password, 10),
        realName: dto.realName,
        roleId: dto.roleId,
      },
    });
    return { id: user.id };
  }

  async update(id: string, dto: UpdateUserDto): Promise<void> {
    const user = await this.getEditable(id);
    const data: Record<string, unknown> = {};
    if (dto.realName !== undefined) data.realName = dto.realName;
    if (dto.roleId) {
      const role = await this.prisma.role.findFirst({ where: { id: dto.roleId } });
      if (!role) throw new BizException(ErrorCode.ROLE_NOT_FOUND);
      data.roleId = dto.roleId;
    }
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.update({ where: { id: user.id }, data });
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto): Promise<void> {
    const user = await this.getEditable(id);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { status: dto.status },
    });
    // 禁用则踢下线（清 Redis 白名单）
    if (dto.status === 0) await this.clearUserTokens(user.id);
  }

  async remove(id: string): Promise<void> {
    const user = await this.getEditable(id);
    await this.prisma.user.delete({ where: { id: user.id } }); // 软删除
    await this.clearUserTokens(user.id);
  }

  async roles() {
    const rows = await this.prisma.role.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map((r) => ({ id: r.id, code: r.code, name: r.name, remark: r.remark }));
  }

  async permissionTree() {
    const perms = await this.prisma.permission.findMany();
    return perms.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      type: p.type,
      parentId: p.parentId,
    }));
  }

  async assignPermissions(roleId: string, permissionIds: string[]): Promise<void> {
    const role = await this.prisma.role.findFirst({ where: { id: roleId } });
    if (!role) throw new BizException(ErrorCode.ROLE_NOT_FOUND);
    if (role.code === SUPER_ADMIN) {
      throw new BizException(ErrorCode.PROTECT_SUPER_ADMIN, '超级管理员权限不可修改');
    }
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
        skipDuplicates: true,
      }),
    ]);
  }

  /** 取可编辑用户，拦截对超管的删除/禁用/改动 */
  private async getEditable(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id },
      include: { role: { select: { code: true } } },
    });
    if (!user) throw new BizException(ErrorCode.NOT_FOUND);
    if (user.role.code === SUPER_ADMIN) {
      throw new BizException(ErrorCode.PROTECT_SUPER_ADMIN);
    }
    return user;
  }

  private async clearUserTokens(userId: string): Promise<void> {
    const client = this.redis.getClient();
    const keys = await client.keys(RedisService.tokenKey(userId, '*'));
    if (keys.length) await client.del(...keys);
  }
}
