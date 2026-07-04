# 电子签章系统 — 技术栈选型与整体架构

> 内部自用电子签章平台。仅对内使用，不对公网开放签署链接以外的任何接口。
> 本文档为前后端 + Codex 对齐基线，任何规范变更须评审后统一更新，禁止私自定义。

---

## 1. 技术栈选型

| 层 | 选型 | 说明 |
|---|---|---|
| 后端框架 | NestJS 10 + TypeScript 5 | 分层清晰（Controller / Service / Repository），内置管道校验、守卫、拦截器、过滤器，天然适配企业级分层 |
| ORM | Prisma / TypeORM（默认 **Prisma**） | 迁移可版本化、类型安全。软删除通过中间件统一拦截 |
| 主库 | PostgreSQL 16 | 事务、JSONB（存坐标/元数据）、行级审计友好 |
| 缓存/限流 | Redis 7 | 登录态（SSO 单点）、接口限流令牌桶、一次性签署链接 token、验证码 |
| 对象存储 | MinIO | PDF 原件、印章图、归档件；私有桶，禁止匿名访问；仅经后端签发的临时预签名 URL 访问 |
| PDF 处理 | pdf-lib | 印章图层叠加、手写签名嵌入、时间戳、元数据写入 |
| 哈希/加密 | node:crypto（SHA256 / bcrypt / AES-256-GCM） | 文件防篡改哈希、密码加密、存储路径加密 |
| 鉴权 | JWT（access + refresh） + Redis 白名单 | 支持续期、单点登录、主动踢下线 |
| 校验 | class-validator + class-transformer | DTO 层强校验 |
| 文档 | Swagger (OpenAPI 3) | 自动生成，作为 Codex 对齐依据 |
| 日志 | Pino + 业务审计表落库 | 系统日志文件化，审计日志入库不可删 |
| 队列（可选） | BullMQ (Redis) | PDF 合成、水印、归档异步化，避免请求阻塞 |

**运行时**：Node.js 20 LTS。**包管理**：pnpm。**容器化**：Docker + docker-compose（Postgres / Redis / MinIO / API）。

---

## 2. 整体架构

```
                        ┌──────────────────────────────────────┐
        内部管理端 ────▶ │            NestJS API (私网)            │
   (RBAC 登录/管理)      │  Guard(JWT/RBAC/Throttle) → Pipe(DTO)  │
                        │        → Controller → Service          │
   外部签署人 ─────────▶ │        → Repository(Prisma)            │
   (仅一次性签署链接)     │  Interceptor(统一响应) Filter(异常)     │
                        └───────┬─────────────┬──────────┬───────┘
                                │             │          │
                         ┌──────▼─────┐ ┌─────▼────┐ ┌───▼──────┐
                         │ PostgreSQL │ │  Redis   │ │  MinIO   │
                         │ 业务/审计   │ │ 态/限流/  │ │ PDF/印章 │
                         │ (软删除)    │ │ 一次性link│ │ (私有桶) │
                         └────────────┘ └──────────┘ └──────────┘
```

### 2.1 分层职责
- **Controller**：仅做路由、参数接收、Swagger 声明。不写业务逻辑。
- **Service**：业务编排、事务边界、领域规则。
- **Repository/Prisma**：数据访问，软删除过滤。
- **Guard**：`JwtAuthGuard`（登录态+Redis 白名单）→ `RolesGuard`（RBAC）→ `PermissionsGuard`（按钮/菜单级）→ `ThrottlerGuard`（限流）。
- **Interceptor**：`TransformInterceptor` 统一响应包装 + `AuditInterceptor` 敏感操作落库。
- **Filter**：`AllExceptionsFilter` 统一错误码输出。

### 2.2 两类访问主体
| 主体 | 入口 | 鉴权方式 |
|---|---|---|
| 内部用户 | `/api/**` 管理接口 | JWT + RBAC |
| 外部签署人 | `/api/sign/:token` 签署接口 | 一次性签署链接 token（Redis 校验 + 任务状态校验 + 有效期），无账号 |

---

## 3. 核心业务流程

```
1. 合同管理员上传 PDF ──▶ 存 MinIO(私有), 记录 SHA256, 状态=草稿
2. 管理员在页面拖拽已启用企业印章盖章 ──▶ 记录印章坐标(JSONB)+印章使用日志
3. 创建签署任务：绑定合同+印章坐标+签署人信息+截止时间
        └─▶ 生成一次性加密签署链接(token→Redis, TTL=截止时间)
4. 发送链接给对方 ──▶ 对方打开：校验 token/任务状态/有效期
5. 对方 画布手写签名 或 上传个人印章 ──▶ 提交
        └─▶ pdf-lib 在指定坐标嵌入签名图层 + 时间戳
        └─▶ 计算最终 SHA256 写入 PDF 元数据 + DB
6. 生成归档版 PDF ──▶ 状态=已签署→已归档，记录 IP/设备/时间/印章使用
7. 全程操作写审计日志，业务数据仅软删除
```

**任务撤回**：签署前可撤回 → 任务状态=已作废 + 撤回原因 + 审计日志；对应签署链接立即失效（删 Redis token）。

---

## 4. 目录结构（NestJS）

```
src/
  common/           # 统一响应/异常/装饰器/守卫/拦截器/工具
    decorators/     # @Roles @Permissions @CurrentUser @Public
    guards/         # jwt / roles / permissions / throttle
    interceptors/   # transform / audit
    filters/        # all-exceptions
    constants/      # error-code.enum.ts (全局错误码, Codex 对齐)
  config/           # 环境配置
  modules/
    auth/           # 登录/JWT/SSO/续期
    user/           # 用户+角色权限 (RBAC)
    seal/           # 企业印章管理
    contract/       # 合同文件管理
    sign-task/      # 签署任务核心
    sign/           # 外部签署人签署端(无鉴权token)
    archive/        # 归档审计+哈希校验
    audit-log/      # 操作日志
  infra/
    prisma/         # PrismaService
    redis/          # RedisService
    minio/          # 存储服务(加密路径/预签名URL)
    pdf/            # pdf-lib 封装(盖章/签名/哈希/元数据)
prisma/
  schema.prisma
  migrations/
docs/               # 本目录: 架构/DB/接口/错误码
scripts/            # 初始化SQL/种子数据/备份脚本
```

---

## 5. 非功能性安全约束落地

| 约束 | 落地方式 |
|---|---|
| 文件加密访问 | MinIO 私有桶；对象 key = `AES-GCM(业务路径)`；仅签发短时效预签名 URL（默认 300s），禁止直链 |
| URL 遍历防护 | 对象 key 用不可枚举 UUID + 加密；接口层校验资源归属 |
| 接口限流 | Redis 令牌桶：登录 5次/分钟/IP、签署链接访问 10次/分钟/token、上传 20次/分钟/用户 |
| 防暴力破解 | 登录失败计数，超阈值锁定账号 15 分钟并告警 |
| PDF 防篡改 | 签署后 SHA256 写入 DB + PDF 元数据；提供校验接口 |
| 禁物理删除 | 全表 `deleted_at`；审计日志/印章使用日志/签署记录**无删除接口** |
| 文件安全校验 | 类型(magic number)+大小+MD5 去重+PDF 结构基础检测 |
| XSS/CSRF | 输出转义、CSP 头、SameSite Cookie、状态变更接口校验来源 |

---

## 6. 环境与交付
- 环境：`.env`（DB/Redis/MinIO/JWT 密钥/加密盐），模板见 `scripts/.env.example`。
- 部署：docker-compose 一键起依赖；API 独立镜像。
- 备份：pg_dump 定时全量 + WAL 归档；MinIO 桶版本化 + 定时同步。
- 详见 `docs/04-deploy-ops.md`（部署手册与安全运维规范，编码阶段补齐）。
