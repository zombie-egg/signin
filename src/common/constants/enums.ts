/**
 * 领域枚举与数字<->字符串映射（前后端对齐）。
 * DB 存数字（省空间、便于状态机比较），API 对外返回字符串（前端直接消费）。
 * 详见 docs/01-database-design.md 状态机 与 frontend/src/types/domain.ts。
 */

// ---- 印章状态 ----
export const SealStatus = { DISABLED: 0, ENABLED: 1 } as const;
export const SEAL_STATUS_TO_STR: Record<number, string> = {
  0: 'DISABLED',
  1: 'ENABLED',
};
export const SEAL_STATUS_TO_INT: Record<string, number> = {
  DISABLED: 0,
  ENABLED: 1,
};

// ---- 印章类型 ----
export const SEAL_TYPE_TO_STR: Record<number, string> = {
  1: 'COMPANY',
  2: 'LEGAL_PERSON',
  3: 'OTHER',
};
export const SEAL_TYPE_TO_INT: Record<string, number> = {
  COMPANY: 1,
  LEGAL_PERSON: 2,
  OTHER: 3,
};

// ---- 合同状态 ----
export const ContractStatus = {
  DRAFT: 0,
  PENDING_SIGN: 1,
  SIGNED: 2,
  VOIDED: 3,
  ARCHIVED: 4,
} as const;
export const CONTRACT_STATUS_TO_STR: Record<number, string> = {
  0: 'DRAFT',
  1: 'PENDING_SIGN',
  2: 'SIGNED',
  3: 'VOIDED',
  4: 'ARCHIVED',
};

// ---- 签署任务状态 ----
export const TaskStatus = {
  PENDING: 0,
  SIGNED: 1,
  REVOKED: 2,
  EXPIRED: 3,
} as const;
export const TASK_STATUS_TO_STR: Record<number, string> = {
  0: 'PENDING',
  1: 'SIGNED',
  2: 'REVOKED',
  3: 'EXPIRED',
};
export const TASK_STATUS_TO_INT: Record<string, number> = {
  PENDING: 0,
  SIGNED: 1,
  REVOKED: 2,
  EXPIRED: 3,
};

// ---- 待签字段类型 ----
export const FieldType = {
  COMPANY_SEAL: 1, // 企业印章（管理员盖，一般在盖章阶段处理）
  HANDWRITE: 2, // 对方手写签名
  PERSONAL_SEAL: 3, // 对方个人印章
} as const;

// ---- 签署方式 ----
export const SignType = { HANDWRITE: 1, PERSONAL_SEAL: 2 } as const;
