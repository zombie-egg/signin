/**
 * 全局业务错误码枚举 (前后端 + Codex 对齐)
 * 结构 AABCC：AA 模块 / B 类别 / CC 序号。详见 docs/02-api-convention-errorcode.md
 */
export enum ErrorCode {
  SUCCESS = 0,

  // 通用 10xxx
  PARAM_INVALID = 10001,
  BODY_MALFORMED = 10002,
  NOT_FOUND = 10003,
  RATE_LIMITED = 10004,
  INTERNAL_ERROR = 10005,
  STATE_NOT_ALLOWED = 10006,

  // 认证鉴权 40xxx
  UNAUTHORIZED = 40101,
  BAD_CREDENTIALS = 40102,
  ACCOUNT_DISABLED = 40103,
  ACCOUNT_LOCKED = 40104,
  REFRESH_INVALID = 40105,
  FORBIDDEN = 40301,
  NO_BUTTON_PERMISSION = 40302,

  // 用户/角色 41xxx
  USERNAME_EXISTS = 41001,
  ROLE_NOT_FOUND = 41002,
  PROTECT_SUPER_ADMIN = 41003,

  // 印章 42xxx
  SEAL_FORMAT_INVALID = 42001,
  SEAL_TOO_LARGE = 42002,
  SEAL_DUPLICATED = 42003,
  SEAL_DISABLED = 42004,
  SEAL_NO_DOWNLOAD_PERM = 42005,

  // 合同 43xxx
  CONTRACT_ONLY_PDF = 43001,
  CONTRACT_TOO_LARGE = 43002,
  CONTRACT_SERIAL_EXISTS = 43003,
  CONTRACT_DUPLICATED = 43004,
  CONTRACT_SECURITY_FAIL = 43005,
  CONTRACT_STATE_NOT_ALLOWED = 43006,

  // 签署任务 44xxx
  TASK_NOT_FOUND = 44001,
  TASK_STATE_NOT_ALLOWED = 44002,
  TASK_COORD_INVALID = 44003,
  TASK_DEADLINE_INVALID = 44004,
  TASK_SIGNED_CANNOT_REVOKE = 44005,

  // 签署端 45xxx
  SIGN_LINK_INVALID = 45001,
  SIGN_LINK_EXPIRED = 45002,
  SIGN_LINK_USED = 45003,
  SIGN_TASK_VOIDED = 45004,
  SIGN_FILE_INVALID = 45005,
  SIGN_IDENTITY_FAIL = 45006,

  // 归档审计 46xxx
  ARCHIVE_NO_DOWNLOAD_PERM = 46001,
  ARCHIVE_HASH_MISMATCH = 46002,
  ARCHIVE_VERIFY_FILE_INVALID = 46003,
}

/** 错误码 -> 默认中文提示 */
export const ErrorMessage: Record<number, string> = {
  [ErrorCode.SUCCESS]: 'success',
  [ErrorCode.PARAM_INVALID]: '参数校验失败',
  [ErrorCode.BODY_MALFORMED]: '请求体格式错误',
  [ErrorCode.NOT_FOUND]: '资源不存在',
  [ErrorCode.RATE_LIMITED]: '请求过于频繁',
  [ErrorCode.INTERNAL_ERROR]: '系统内部错误',
  [ErrorCode.STATE_NOT_ALLOWED]: '操作不被允许',

  [ErrorCode.UNAUTHORIZED]: '登录已失效，请重新登录',
  [ErrorCode.BAD_CREDENTIALS]: '账号或密码错误',
  [ErrorCode.ACCOUNT_DISABLED]: '账号已禁用',
  [ErrorCode.ACCOUNT_LOCKED]: '账号已锁定，请稍后再试',
  [ErrorCode.REFRESH_INVALID]: '登录凭证无效',
  [ErrorCode.FORBIDDEN]: '无权限访问',
  [ErrorCode.NO_BUTTON_PERMISSION]: '无该操作权限',

  [ErrorCode.USERNAME_EXISTS]: '用户名已存在',
  [ErrorCode.ROLE_NOT_FOUND]: '角色不存在',
  [ErrorCode.PROTECT_SUPER_ADMIN]: '不可操作超级管理员',

  [ErrorCode.SEAL_FORMAT_INVALID]: '印章文件格式不合法（须透明PNG）',
  [ErrorCode.SEAL_TOO_LARGE]: '印章文件超过大小限制',
  [ErrorCode.SEAL_DUPLICATED]: '印章已存在',
  [ErrorCode.SEAL_DISABLED]: '印章已禁用，不可使用',
  [ErrorCode.SEAL_NO_DOWNLOAD_PERM]: '无权预览/下载印章原图',

  [ErrorCode.CONTRACT_ONLY_PDF]: '仅支持 PDF 文件',
  [ErrorCode.CONTRACT_TOO_LARGE]: '文件超过大小限制',
  [ErrorCode.CONTRACT_SERIAL_EXISTS]: '合同编号已存在',
  [ErrorCode.CONTRACT_DUPLICATED]: '文件重复',
  [ErrorCode.CONTRACT_SECURITY_FAIL]: '文件安全检测未通过',
  [ErrorCode.CONTRACT_STATE_NOT_ALLOWED]: '合同状态不允许该操作',

  [ErrorCode.TASK_NOT_FOUND]: '签署任务不存在',
  [ErrorCode.TASK_STATE_NOT_ALLOWED]: '任务状态不允许该操作',
  [ErrorCode.TASK_COORD_INVALID]: '印章坐标参数非法',
  [ErrorCode.TASK_DEADLINE_INVALID]: '截止时间非法',
  [ErrorCode.TASK_SIGNED_CANNOT_REVOKE]: '任务已签署，不可撤回',

  [ErrorCode.SIGN_LINK_INVALID]: '签署链接无效',
  [ErrorCode.SIGN_LINK_EXPIRED]: '签署链接已过期',
  [ErrorCode.SIGN_LINK_USED]: '签署链接已使用',
  [ErrorCode.SIGN_TASK_VOIDED]: '签署任务已作废',
  [ErrorCode.SIGN_FILE_INVALID]: '签名/印章文件不合法',
  [ErrorCode.SIGN_IDENTITY_FAIL]: '签署人身份校验失败',

  [ErrorCode.ARCHIVE_NO_DOWNLOAD_PERM]: '无权下载归档文件',
  [ErrorCode.ARCHIVE_HASH_MISMATCH]: '文件哈希校验不通过，文件可能被篡改',
  [ErrorCode.ARCHIVE_VERIFY_FILE_INVALID]: '上传的校验文件格式错误',
};
