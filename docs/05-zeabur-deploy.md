# Zeabur 部署说明

## 服务拆分

当前仓库根目录是 NestJS 后端，`frontend/` 是 Vite 前端。Zeabur 上建议至少拆成：

- `signin-api`：GitHub 服务，Root Directory 保持仓库根目录，使用本仓库 `nixpacks.toml`。
- `signin-web`：GitHub 服务，Root Directory 设置为 `frontend`。
- PostgreSQL、Redis、MinIO：分别作为独立服务或外部托管服务提供连接信息。

## 后端环境变量

在 Zeabur 后端服务的 `Variable` 页面配置：

```bash
NODE_ENV=production
API_PREFIX=api

DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public

REDIS_HOST=HOST
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

JWT_ACCESS_SECRET=replace_with_at_least_32_chars
JWT_REFRESH_SECRET=replace_with_at_least_32_chars
JWT_ACCESS_TTL=7200
JWT_REFRESH_TTL=604800

MINIO_ENDPOINT=HOST
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=ACCESS_KEY
MINIO_SECRET_KEY=SECRET_KEY
MINIO_BUCKET=esign
MINIO_PRESIGN_TTL=300

STORAGE_KEY_ENC_SECRET=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

LOGIN_MAX_FAIL=5
LOGIN_LOCK_MINUTES=15
UPLOAD_CONTRACT_MAX_MB=50
UPLOAD_SEAL_MAX_MB=5

SIGN_LINK_BASE_URL=https://YOUR_FRONTEND_DOMAIN/sign
SEED_ON_START=true
```

`STORAGE_KEY_ENC_SECRET` 必须是 64 位 hex。生产启用后不要更换，否则已上传文件的对象 key 无法解密。

## 启动流程

Zeabur 会读取根目录 `nixpacks.toml`：

1. 安装 Node.js 20 和 pnpm。
2. 执行 `pnpm install --frozen-lockfile`。
3. 执行 `pnpm exec prisma generate` 和 `pnpm build`。
4. 启动时执行 `pnpm run start:zeabur`。

`start:zeabur` 会先用 `prisma db push` 同步数据库结构，再按需执行 seed，最后启动 `dist/main.js`。

首次部署建议保留 `SEED_ON_START=true`，确认超管账号可登录后可以改为 `false`，避免每次重启都重置 `admin / Ccj940904`。
