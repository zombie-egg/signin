// 枚举值 -> 中文展示映射（与后端 src/common/constants/enums.ts 对齐）

export const sealStatusText: Record<string, string> = {
  ENABLED: "启用",
  DISABLED: "禁用",
};

export const sealTypeText: Record<string, string> = {
  COMPANY: "公章",
  LEGAL_PERSON: "法人私章",
  OTHER: "其他",
};

export const contractStatusText: Record<string, string> = {
  DRAFT: "草稿",
  PENDING_SIGN: "待签署",
  SIGNED: "已签署",
  VOIDED: "已作废",
  ARCHIVED: "已归档",
};

export const taskStatusText: Record<string, string> = {
  PENDING: "待签署",
  SIGNED: "已签署",
  REVOKED: "已作废",
  EXPIRED: "已过期",
};

export const roleText: Record<string, string> = {
  SUPER_ADMIN: "超级管理员",
  CONTRACT_ADMIN: "合同管理员",
  READONLY: "只读用户",
  ADMIN: "管理员",
  SEAL_MANAGER: "印章管理员",
  CONTRACT_OPERATOR: "合同操作员",
  AUDITOR: "审计员",
};

// 审计动作 -> 中文
export const actionText: Record<string, string> = {
  LOGIN: "登录",
  CHANGE_PASSWORD: "修改密码",
  USER_CREATE: "新建用户",
  USER_UPDATE: "修改用户",
  USER_STATUS: "启停用户",
  USER_DELETE: "删除用户",
  ROLE_ASSIGN: "配置角色权限",
  SEAL_UPLOAD: "上传印章",
  SEAL_STATUS: "启停印章",
  SEAL_DELETE: "删除印章",
  SEAL_USE: "使用印章",
  CONTRACT_UPLOAD: "上传合同",
  CONTRACT_VOID: "作废合同",
  CONTRACT_DELETE: "删除合同",
  TASK_CREATE: "创建签署任务",
  TASK_REVOKE: "撤回签署任务",
  SIGN_SUBMIT: "提交签署",
  ARCHIVE_DOWNLOAD: "下载归档件",
};

// 审计目标类型 -> 中文
export const targetTypeText: Record<string, string> = {
  user: "用户",
  role: "角色",
  seal: "印章",
  contract: "合同",
  sign_task: "签署任务",
};

// 权限码 -> 中文（个人中心展示用）
export const permissionText: Record<string, string> = {
  "user:list": "用户列表",
  "user:create": "新建用户",
  "user:update": "修改用户",
  "user:delete": "删除用户",
  "role:list": "角色列表",
  "role:assign": "配置角色权限",
  "seal:list": "印章列表",
  "seal:upload": "上传印章",
  "seal:update": "启停印章",
  "seal:delete": "删除印章",
  "seal:use": "使用印章",
  "seal:download": "下载印章原图",
  "contract:list": "合同列表",
  "contract:upload": "上传合同",
  "contract:update": "修改合同",
  "contract:download": "预览合同",
  "contract:void": "作废合同",
  "contract:delete": "删除合同",
  "signtask:list": "签署任务列表",
  "signtask:create": "创建签署任务",
  "signtask:revoke": "撤回签署任务",
  "signtask:delete": "删除签署任务",
  "archive:list": "归档查询",
  "archive:download": "下载归档件",
  "audit:list": "审计日志",
};

/** 安全取值：无映射时回退原文 */
export const label = (map: Record<string, string>, key?: string | null): string =>
  (key && map[key]) || key || "-";
