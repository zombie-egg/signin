import type { PermissionCode } from "../types/domain";

export interface NavItem {
  label: string;
  path: string;
  permission?: PermissionCode;
}

export const navItems: NavItem[] = [
  { label: "个人中心", path: "/profile" },
  { label: "修改密码", path: "/change-password" },
  { label: "印章管理", path: "/seals", permission: "seal:list" },
  { label: "合同草稿", path: "/contracts", permission: "contract:list" },
  { label: "上传合同", path: "/contracts/upload", permission: "contract:upload" },
  { label: "盖章任务", path: "/contracts/stamp", permission: "seal:use" },
  { label: "签署任务", path: "/sign-tasks", permission: "signtask:list" },
];
