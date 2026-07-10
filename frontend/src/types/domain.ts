export type RoleCode = "SUPER_ADMIN" | "ADMIN" | "SEAL_MANAGER" | "CONTRACT_OPERATOR" | "AUDITOR" | string;

export type PermissionCode =
  | "seal:list"
  | "seal:upload"
  | "seal:update"
  | "seal:delete"
  | "seal:download"
  | "seal:use"
  | "contract:list"
  | "contract:upload"
  | "contract:update"
  | "contract:download"
  | "contract:void"
  | "contract:delete"
  | "signtask:list"
  | "signtask:create"
  | "signtask:revoke"
  | "signtask:delete"
  | "archive:list"
  | "archive:download"
  | "audit:list"
  | string;

export interface UserProfile {
  id: string;
  username: string;
  realName: string;
  roleCode: RoleCode;
  permissions: PermissionCode[];
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Seal {
  id: string;
  name: string;
  type: string;
  status: "ENABLED" | "DISABLED";
  previewUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Contract {
  id: string;
  name: string;
  serialNo: string;
  status: "DRAFT" | "PENDING_SIGN" | "SIGNED" | "VOIDED" | string;
  remark?: string;
  mimeType?: string;
  fileExt?: string;
  isPdf?: boolean;
  previewUrl?: string;
  fileUrl?: string;
  createdAt?: string;
  uploadedAt?: string;
}

export interface StampPlacement {
  sealId: string;
  page: number;
  posX: number;
  posY: number;
  width: number;
  height: number;
}

export interface SignField {
  fieldId?: string;
  fieldType: 2 | 3;
  page: number;
  posX: number;
  posY: number;
  width: number;
  height: number;
}

export interface SignTask {
  id: string;
  contractId: string;
  contractName?: string;
  signerName: string;
  signerContact: string;
  status: "PENDING" | "SIGNED" | "REVOKED" | "EXPIRED" | string;
  deadline: string;
  signUrl?: string;
  sha256?: string;
  signedIp?: string;
  signedDevice?: string;
  signedAt?: string;
  createdAt?: string;
}

export interface AuditLog {
  id: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  ip?: string;
  createdAt: string;
}

export interface PublicSignPayload {
  contractName: string;
  signerName: string;
  deadline: string;
  previewUrl: string;
  fields: SignField[];
}
