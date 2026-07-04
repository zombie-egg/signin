# 部署手册与安全运维规范

## 1. 环境要求
- Node.js 20 LTS，pnpm 9（`corepack pnpm`）
- Docker / docker-compose（PostgreSQL 16、Redis 7、MinIO）

## 2. 本地/内网启动

```bash
# 1. 起依赖
docker compose up -d

# 2. 配置环境变量
cp scripts/.env.example .env
#   ★ 必改：JWT_ACCESS_SECRET / JWT_REFRESH_SECRET / STORAGE_KEY_ENC_SECRET(64位hex)
#           MINIO/DB 密码，生产禁用默认值

# 3. 安装依赖 + 生成 Prisma Client
corepack pnpm install
corepack pnpm exec prisma generate

# 4. 建表（二选一）
corepack pnpm exec prisma migrate deploy      # 用迁移(推荐)
#   或无 Node 环境时: psql "$DATABASE_URL" -f scripts/init.sql

# 5. 初始化角色/权限/超管
corepack pnpm seed
#   超管账号: admin / Ccj940904  （seed 可重复执行，会重置该密码）

# 6. 启动
corepack pnpm start:dev        # 开发
corepack pnpm build && corepack pnpm start:prod   # 生产
```

- API: `http://localhost:3000/api`
- Swagger（非生产）: `http://localhost:3000/docs-api`
- MinIO 控制台: `http://localhost:9001`

## 3. 安全运维规范

### 密钥
- 三个密钥必须替换默认值，长度 ≥ 32 字符；`STORAGE_KEY_ENC_SECRET` 必须为 64 位 hex（32 字节）。
- 密钥仅存 `.env`（不入 git）或密钥管理服务；轮换 JWT 密钥会使全部登录态失效（需重新登录）。
- `STORAGE_KEY_ENC_SECRET` 一旦启用不可更改，否则已存对象 key 无法解密——如需轮换须做数据迁移。

### 网络
- 仅签署端 `/api/sign/:token` 需对外可达；其余管理接口限内网/VPN。
- MinIO 桶保持私有，绝不开放匿名读；外部访问一律走后端签发的短时效预签名 URL。
- 生产关闭 Swagger（`NODE_ENV=production` 已自动关闭）。

### 限流（已内置，Redis 支撑）
- 全局 100 次/分钟/IP；登录 5 次/分钟/IP；签署链接、上传接口在各自控制器用 `@Throttle` 收紧。

### 数据保护
- 所有业务数据软删除，审计日志/印章使用/签署记录**永不物理删除**。
- 每日执行 `scripts/backup.sh`（pg_dump + MinIO mirror），保留 14 份；定期演练恢复。
- 生产 PostgreSQL 开启 WAL 归档以支持 PITR。

### 审计
- 敏感操作（登录、改账号、删合同、用印章、撤回任务）经 `@Audit` 落库，含操作人、IP、UA、明细。
- 定期离线导出 `audit_log` 归档，满足合规留痕。

## 4. 常见问题
- **登录后接口 401**：检查 Redis 是否可达（登录态白名单存 Redis），及 access token 是否过期（用 `/auth/refresh`）。
- **文件预览 403/链接失效**：预签名 URL 默认 300s 过期，重新请求预览接口获取新 URL。
- **prisma generate 报错**：确认 `DATABASE_URL` 可连、`pnpm install` 完成。
