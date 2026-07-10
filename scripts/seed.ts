/**
 * 初始化种子：权限 -> 角色 -> 角色权限 -> 超级管理员账号。
 * 幂等：可重复执行（upsert）。运行：pnpm seed
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// 权限清单（与 docs/03-api-full.md 权限码一致）
const PERMISSIONS: { code: string; name: string; type: string }[] = [
  { code: 'user:list', name: '用户列表', type: 'menu' },
  { code: 'user:create', name: '新建用户', type: 'button' },
  { code: 'user:update', name: '修改用户', type: 'button' },
  { code: 'user:delete', name: '删除用户', type: 'button' },
  { code: 'role:list', name: '角色列表', type: 'menu' },
  { code: 'role:assign', name: '配置角色权限', type: 'button' },
  { code: 'seal:list', name: '印章列表', type: 'menu' },
  { code: 'seal:upload', name: '上传印章', type: 'button' },
  { code: 'seal:update', name: '启停印章', type: 'button' },
  { code: 'seal:delete', name: '删除印章', type: 'button' },
  { code: 'seal:use', name: '使用印章盖章', type: 'button' },
  { code: 'seal:download', name: '下载印章原图', type: 'button' },
  { code: 'contract:list', name: '合同列表', type: 'menu' },
  { code: 'contract:upload', name: '上传合同', type: 'button' },
  { code: 'contract:update', name: '修改合同', type: 'button' },
  { code: 'contract:download', name: '预览合同', type: 'button' },
  { code: 'contract:void', name: '作废合同', type: 'button' },
  { code: 'contract:delete', name: '删除合同', type: 'button' },
  { code: 'signtask:list', name: '签署任务列表', type: 'menu' },
  { code: 'signtask:create', name: '创建签署任务', type: 'button' },
  { code: 'signtask:revoke', name: '撤回签署任务', type: 'button' },
  { code: 'signtask:delete', name: '删除签署任务', type: 'button' },
  { code: 'archive:list', name: '归档查询', type: 'menu' },
  { code: 'archive:download', name: '下载归档件', type: 'button' },
  { code: 'audit:list', name: '审计日志', type: 'menu' },
];

// 合同管理员：除用户/角色管理外的业务权限
const CONTRACT_ADMIN_PERMS = PERMISSIONS.map((p) => p.code).filter(
  (c) => !c.startsWith('user:') && !c.startsWith('role:'),
);
// 只读用户：仅列表/查看，无写、无下载源文件
const READONLY_PERMS = [
  'seal:list',
  'contract:list',
  'signtask:list',
  'archive:list',
];

async function main(): Promise<void> {
  // 1. 权限
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { name: p.name, type: p.type },
      create: p,
    });
  }
  const allPerms = await prisma.permission.findMany();
  const byCode = new Map(allPerms.map((p) => [p.code, p.id]));

  // 2. 角色
  const superRole = await prisma.role.upsert({
    where: { code: 'SUPER_ADMIN' },
    update: {},
    create: { code: 'SUPER_ADMIN', name: '超级管理员', remark: '拥有全部权限' },
  });
  const contractRole = await prisma.role.upsert({
    where: { code: 'CONTRACT_ADMIN' },
    update: {},
    create: { code: 'CONTRACT_ADMIN', name: '合同管理员' },
  });
  const readonlyRole = await prisma.role.upsert({
    where: { code: 'READONLY' },
    update: {},
    create: { code: 'READONLY', name: '只读用户' },
  });

  // 3. 角色权限（超管在 Guard 层放行全部，这里也全量挂上以便前端渲染菜单）
  async function bind(roleId: string, codes: string[]): Promise<void> {
    await prisma.rolePermission.deleteMany({ where: { roleId } });
    await prisma.rolePermission.createMany({
      data: codes
        .map((c) => byCode.get(c))
        .filter((id): id is string => !!id)
        .map((permissionId) => ({ roleId, permissionId })),
      skipDuplicates: true,
    });
  }
  await bind(superRole.id, PERMISSIONS.map((p) => p.code));
  await bind(contractRole.id, CONTRACT_ADMIN_PERMS);
  await bind(readonlyRole.id, READONLY_PERMS);

  // 4. 超管账号（admin / Ccj940904）。已存在则同步重置为该密码，保证可登录。
  const username = 'admin';
  const password = 'Ccj940904';
  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findFirst({ where: { username } });
  if (!existing) {
    await prisma.user.create({
      data: { username, passwordHash, realName: '超级管理员', roleId: superRole.id },
    });
    console.log(`已创建超管账号: ${username} / ${password}`);
  } else {
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, roleId: superRole.id, status: 1, failCount: 0, lockedUntil: null },
    });
    console.log(`超管账号已存在，已重置密码为: ${username} / ${password}`);
  }

  console.log('种子初始化完成');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
