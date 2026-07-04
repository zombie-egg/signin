# 数据库设计 · ER 图 · 索引说明

> PostgreSQL 16。所有业务表软删除（`deleted_at`），审计类表**只增不删不改**。
> 时间统一 `timestamptz`，主键统一 `uuid`（`gen_random_uuid()`）。

---

## 1. ER 图

```
                    ┌─────────────┐
                    │    role     │
                    └──────┬──────┘
                           │ 1
                           │        role_permission (N:N)
                    ┌──────┴──────┐◀──────────────┐
                    │    user     │          ┌─────┴──────┐
                    └──────┬──────┘          │ permission │
                           │ 1               └────────────┘
        ┌──────────────────┼───────────────────────────────┐
        │ N                │ N                              │ N
 ┌──────┴──────┐   ┌───────┴──────┐                 ┌───────┴──────┐
 │  contract   │   │     seal     │                 │  audit_log   │
 └──────┬──────┘   └───────┬──────┘                 └──────────────┘
        │ 1                │ 1
        │                  │
 ┌──────┴──────────────────┴──────┐
 │          sign_task             │  (合同 1:N 任务, 任务引用多枚印章坐标)
 └──────┬──────────────────┬──────┘
        │ 1                │ 1
 ┌──────┴──────┐   ┌───────┴────────┐   ┌──────────────┐
 │ seal_usage  │   │  sign_record   │   │ signer_field │
 │  (印章使用) │   │  (签署回传)     │   │ (签名/印章坐标)│
 └─────────────┘   └────────────────┘   └──────────────┘
```

关系概览：
- `user N:1 role`；`role N:N permission`（`role_permission`）。
- `contract 1:N sign_task`；`sign_task 1:N signer_field`（每个待签字段/印章位一条）。
- `sign_task 1:N seal_usage`（企业印章使用留痕）、`1:N sign_record`（对方回传签名）。
- `audit_log` 关联 `user`（可空，外部签署人操作 user 为空，记 signer 信息）。

---

## 2. 表结构

### 2.1 用户与权限

**user（内部账号）**
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | PK | |
| username | varchar(50) | UNIQUE, NOT NULL | 登录名 |
| password_hash | varchar(100) | NOT NULL | bcrypt |
| real_name | varchar(50) | | 姓名 |
| role_id | uuid | FK→role | |
| status | smallint | NOT NULL default 1 | 1启用 0禁用 |
| last_login_at | timestamptz | | |
| fail_count | smallint | default 0 | 登录失败计数 |
| locked_until | timestamptz | | 锁定截止 |
| created_at / updated_at | timestamptz | | |
| deleted_at | timestamptz | NULL | 软删除 |

**role**：`id, code(UNIQUE), name, remark, created_at, updated_at, deleted_at`
预置：`SUPER_ADMIN`（超管）、`CONTRACT_ADMIN`（合同管理员）、`READONLY`（只读）。

**permission**：`id, code(UNIQUE), name, type(menu|button|api), parent_id, remark`
示例 code：`contract:upload` `contract:delete` `seal:use` `seal:download` `signtask:create` `signtask:revoke` `archive:download`。

**role_permission**：`role_id(FK), permission_id(FK)`，联合主键。

### 2.2 印章

**seal**
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | PK | |
| name | varchar(100) | NOT NULL | 印章名称 |
| type | smallint | NOT NULL | 1公章 2法人私章 3其他 |
| object_key | varchar(255) | NOT NULL | MinIO 加密 key（透明PNG，已压缩+盲水印） |
| file_md5 | char(32) | NOT NULL | 去重 |
| status | smallint | default 1 | 1启用 0禁用 |
| uploader_id | uuid | FK→user | |
| created_at / updated_at / deleted_at | timestamptz | | |

**seal_usage（印章使用日志 · 不可删）**
`id, seal_id(FK), sign_task_id(FK), contract_id(FK), operator_id(FK→user), page, pos_x, pos_y, width, height, used_at, ip`

### 2.3 合同

**contract**
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | PK | |
| name | varchar(200) | NOT NULL | 合同名称 |
| serial_no | varchar(100) | UNIQUE(未删) | 自定义编号 |
| object_key | varchar(255) | NOT NULL | 原件 MinIO key |
| file_md5 | char(32) | NOT NULL | 去重 |
| file_sha256 | char(64) | NOT NULL | 防篡改哈希 |
| file_size | int | NOT NULL | 字节 |
| remark | text | | 备注 |
| status | smallint | NOT NULL default 0 | 0草稿 1待签署 2已签署 3已作废 4已归档 |
| uploader_id | uuid | FK→user | |
| created_at / updated_at / deleted_at | timestamptz | | |

### 2.4 签署任务（核心）

**sign_task**
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | PK | |
| contract_id | uuid | FK→contract | 目标合同 |
| signer_name | varchar(50) | NOT NULL | 签署人姓名 |
| signer_contact | varchar(100) | NOT NULL | 手机/邮箱 |
| link_token | char(64) | UNIQUE | 一次性链接 token（同步 Redis） |
| status | smallint | NOT NULL default 0 | 0待签署 1已签署 2已作废 3已过期 |
| deadline | timestamptz | NOT NULL | 截止=链接有效期 |
| revoke_reason | varchar(255) | | 撤回原因 |
| archived_object_key | varchar(255) | | 归档件 key |
| archived_sha256 | char(64) | | 归档件哈希 |
| creator_id | uuid | FK→user | |
| created_at / updated_at / deleted_at | timestamptz | | |

**signer_field（待签字段/印章位坐标）**
`id, sign_task_id(FK), field_type(1企业印章 2手写签名 3个人印章), seal_id(FK,可空), page, pos_x, pos_y, width, height, required, filled(bool)`
> 坐标以 PDF 左下角为原点，单位 pt；亦可用 JSONB `coord` 存归一化坐标。

**sign_record（对方签署回传 · 不可删）**
`id, sign_task_id(FK), signer_field_id(FK), sign_type(1手写 2个人印章), object_key(签名/印章图), signed_at, ip, user_agent, device_info`

### 2.5 审计

**audit_log（操作日志 · 只增）**
| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid | PK |
| operator_id | uuid FK→user, NULL | 内部操作人；外部签署为空 |
| operator_name | varchar(50) | 冗余留存（防用户软删后不可读） |
| action | varchar(50) | 如 `LOGIN` `CONTRACT_DELETE` `SEAL_USE` `TASK_REVOKE` |
| target_type | varchar(30) | contract/seal/user/sign_task |
| target_id | uuid | |
| detail | jsonb | 操作明细/变更前后 |
| ip | varchar(45) | |
| user_agent | varchar(255) | |
| created_at | timestamptz | |

---

## 3. 索引设计

| 表 | 索引 | 目的 |
|---|---|---|
| user | UNIQUE(username) WHERE deleted_at IS NULL | 登录名唯一（软删可复用） |
| contract | UNIQUE(serial_no) WHERE deleted_at IS NULL | 编号唯一 |
| contract | INDEX(status, created_at) | 归档列表按状态+时间筛选 |
| contract | INDEX(file_md5) | 上传去重 |
| contract | INDEX(uploader_id) | 按上传人查 |
| seal | INDEX(status) / UNIQUE(file_md5) WHERE deleted_at IS NULL | 启用筛选/去重 |
| sign_task | UNIQUE(link_token) | 链接鉴权 |
| sign_task | INDEX(contract_id) / INDEX(status, deadline) | 关联查询/过期扫描 |
| sign_task | INDEX(signer_name) | 归档按签署人筛选 |
| signer_field | INDEX(sign_task_id) | |
| seal_usage | INDEX(seal_id) / INDEX(sign_task_id) | 溯源 |
| sign_record | INDEX(sign_task_id) | |
| audit_log | INDEX(operator_id) / INDEX(action, created_at) / INDEX(target_type, target_id) | 审计查询 |

**软删除实现**：Prisma 中间件全局拦截 `find*` 追加 `deleted_at IS NULL`；`delete` 改写为 `update deleted_at=now()`。审计/使用/签署记录表**不注册删除方法**。

---

## 4. 状态机

**合同**：草稿(0) → 待签署(1) → 已签署(2) → 已归档(4)；任一非归档态 → 已作废(3)。
**签署任务**：待签署(0) → 已签署(1)；待签署 →(撤回) 已作废(2)；待签署 →(超期) 已过期(3)。
状态流转在 Service 层强校验，非法流转返回 `40901 状态不允许`。
