# 完整接口文档

> 统一前缀 `/api`。除标注「公开/签署端」外均需 `Authorization: Bearer`。
> 权限列 = 所需 permission code；`-` 表示登录即可。响应统一包裹（见 02 号文档）。

图例：🔒需登录 · 🌐签署端公开 · P=所需权限

---

## 模块 1 · 认证 Auth `/api/auth`

| 方法 | 路径 | 说明 | P |
|---|---|---|---|
| POST | `/auth/login` | 登录，签发 access+refresh | 🌐 |
| POST | `/auth/refresh` | 刷新 access token | 🔒 |
| POST | `/auth/logout` | 登出，清 Redis 白名单 | 🔒 |
| GET | `/auth/me` | 当前用户信息+权限码列表 | 🔒 |

**POST /auth/login**
```jsonc
// req
{ "username": "admin", "password": "******" }
// res.data
{ "accessToken": "...", "refreshToken": "...", "expiresIn": 7200,
  "user": { "id": "...", "username": "admin", "realName": "张三",
            "roleCode": "SUPER_ADMIN", "permissions": ["contract:upload", "..."] } }
```
错误：40102 密码错误 / 40103 禁用 / 40104 锁定 / 10004 限流。

---

## 模块 1 · 用户与角色 `/api/users` `/api/roles`

| 方法 | 路径 | 说明 | P |
|---|---|---|---|
| GET | `/users` | 用户列表（分页） | `user:list` |
| POST | `/users` | 新建账号 | `user:create` |
| PUT | `/users/:id` | 修改账号 | `user:update` |
| PATCH | `/users/:id/status` | 启用/禁用 | `user:update` |
| DELETE | `/users/:id` | 软删除 | `user:delete` |
| GET | `/roles` | 角色列表 | `role:list` |
| GET | `/permissions/tree` | 权限树（菜单/按钮） | `role:list` |
| PUT | `/roles/:id/permissions` | 配置角色权限 | `role:assign` |

**POST /users**
```jsonc
{ "username": "u01", "password": "Init@123", "realName": "李四", "roleId": "..." }
```
错误：41001 用户名已存在 / 41003 保护超管。

---

## 模块 2 · 企业印章 `/api/seals`

| 方法 | 路径 | 说明 | P |
|---|---|---|---|
| GET | `/seals` | 印章列表（分页, 可按 status/type 筛选） | `seal:list` |
| POST | `/seals` | 上传印章（multipart：file, name, type） | `seal:upload` |
| PATCH | `/seals/:id/status` | 启用/禁用 | `seal:update` |
| DELETE | `/seals/:id` | 软删除 | `seal:delete` |
| GET | `/seals/:id/preview` | 预览原图（签发预签名URL, 300s） | `seal:download` |

- 上传后：压缩 + 盲水印 + MD5 去重(42003) + 仅透明PNG(42001)。
- 列表返回缩略引用（打码/低清），原图仅 `seal:download` 可取。

---

## 模块 3 · 合同 `/api/contracts`

| 方法 | 路径 | 说明 | P |
|---|---|---|---|
| GET | `/contracts` | 列表（分页, 多条件筛选） | `contract:list` |
| POST | `/contracts` | 上传合同（multipart：file, name, serialNo, remark） | `contract:upload` |
| GET | `/contracts/:id` | 详情 | `contract:list` |
| PUT | `/contracts/:id` | 修改基础信息（草稿态） | `contract:update` |
| POST | `/contracts/:id/stamp` | 拖拽盖企业印章（记坐标+使用日志） | `seal:use` |
| GET | `/contracts/:id/file` | 预览原件（预签名URL） | `contract:download` |
| POST | `/contracts/:id/void` | 作废 | `contract:void` |
| DELETE | `/contracts/:id` | 软删除 | `contract:delete` |

**GET /contracts 查询参数**：`name, serialNo, status, signerName, startDate, endDate, page, pageSize`

**POST /contracts/:id/stamp**
```jsonc
{ "stamps": [
  { "sealId": "...", "page": 1, "posX": 400, "posY": 120, "width": 120, "height": 120 }
] }
```
错误：42004 印章禁用 / 43006 状态不允许 / 44003 坐标非法。

---

## 模块 4 · 签署任务 `/api/sign-tasks`（核心）

| 方法 | 路径 | 说明 | P |
|---|---|---|---|
| GET | `/sign-tasks` | 列表（分页, 按状态/签署人筛选） | `signtask:list` |
| POST | `/sign-tasks` | 创建任务，生成一次性签署链接 | `signtask:create` |
| GET | `/sign-tasks/:id` | 详情（含 signer_field、签署记录） | `signtask:list` |
| POST | `/sign-tasks/:id/revoke` | 撤回（填原因，失效链接） | `signtask:revoke` |
| DELETE | `/sign-tasks/:id` | 删除任务（软删除并失效链接） | `signtask:delete` |
| GET | `/sign-tasks/:id/link` | 重新获取/查看签署链接 | `signtask:create` |

**POST /sign-tasks**
```jsonc
// req
{ "contractId": "...", "signerName": "王五", "signerContact": "13800000000",
  "deadline": "2026-07-10T18:00:00+08:00",
  "fields": [
    { "fieldType": 2, "page": 2, "posX": 300, "posY": 100, "width": 160, "height": 60 }, // 手写签名
    { "fieldType": 3, "page": 2, "posX": 480, "posY": 100, "width": 120, "height": 120 }  // 个人印章
  ] }
// res.data
{ "taskId": "...", "signUrl": "https://host/sign/<token>", "expireAt": "2026-07-10T18:00:00+08:00" }
```
错误：43006 合同状态不允许 / 44004 截止时间非法 / 44003 坐标非法。

**POST /sign-tasks/:id/revoke** `{ "reason": "对方信息填错" }` → 44005 已签署不可撤回。

---

## 模块 4 · 签署端 `/api/sign`（🌐 无账号，token 鉴权）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/sign/:token` | 校验链接并返回待签合同信息+待签字段 |
| GET | `/sign/:token/file` | 获取合同预览（预签名URL, 受token约束） |
| POST | `/sign/:token/submit` | 提交签名/印章，合成归档PDF |

**GET /sign/:token → res.data**
```jsonc
{ "contractName": "...", "signerName": "王五", "deadline": "...",
  "previewUrl": "...",
  "fields": [ { "fieldId": "...", "fieldType": 2, "page": 2, "posX": 300, "posY": 100, "width": 160, "height": 60 } ] }
```
错误：45001 无效 / 45002 过期 / 45003 已使用 / 45004 已作废。

**POST /sign/:token/submit**（multipart）
```
signatures[]: 每个待签字段一项
  fieldId: string
  signType: 1手写 | 2个人印章
  file: 手写签名png / 个人印章图
```
处理：pdf-lib 按坐标嵌入 → 写时间戳 → 计算最终 SHA256 写 DB + PDF 元数据 → 记录 IP/UA/设备 → 任务=已签署、合同=已签署→归档。
错误：45005 文件不合法 / 45002 过期 / 45004 作废。

---

## 模块 5 · 归档审计 `/api/archive` `/api/audit-logs`

| 方法 | 路径 | 说明 | P |
|---|---|---|---|
| GET | `/archive/contracts` | 归档合同多条件筛选（分页） | `archive:list` |
| GET | `/archive/contracts/:id/download` | 下载归档PDF（预签名URL） | `archive:download` |
| POST | `/archive/verify` | 上传PDF校验SHA256是否被篡改（multipart：file, contractId） | `archive:list` |
| GET | `/audit-logs` | 操作日志查询（分页, 按操作人/action/时间/目标筛选） | `audit:list` |
| GET | `/seals/:id/usage` | 某印章使用记录 | `audit:list` |

**POST /archive/verify → res.data**
```jsonc
{ "match": true, "expectedSha256": "...", "actualSha256": "...", "signedAt": "..." }
```
`match=false` → 业务上返回 46002 文件可能被篡改；普通用户 46001 无下载权限。

---

## 交付脚本清单（编码阶段产出）
- `prisma/schema.prisma` + `prisma/migrations` — 表结构与迁移
- `scripts/seed.ts` — 角色/权限/超管初始化
- `scripts/init.sql` — 纯 SQL 初始化脚本（供无 Node 环境部署）
- `scripts/.env.example` — 环境配置模板
- `scripts/backup.sh` — pg_dump + MinIO 同步备份
- `docker-compose.yml` — Postgres/Redis/MinIO/API
- `docs/04-deploy-ops.md` — 部署手册与安全运维规范
