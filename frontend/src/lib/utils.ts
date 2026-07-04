import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value?: string | Date) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function assertTransparentPng(file: File, maxMb = 8) {
  if (file.type !== "image/png") return "仅允许上传透明 PNG 图片";
  if (file.size > maxMb * 1024 * 1024) return `文件不能超过 ${maxMb}MB`;
  return "";
}

// 支持的合同文件扩展名（任意常见格式；仅 PDF 可在线盖章/签署）
const CONTRACT_EXTS = [
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".png", ".jpg", ".jpeg", ".tiff", ".txt",
];

export function assertContractFile(file: File, maxMb = 50) {
  const name = file.name.toLowerCase();
  const ok = CONTRACT_EXTS.some((ext) => name.endsWith(ext));
  if (!ok) return `不支持的文件类型，允许：${CONTRACT_EXTS.join(" / ")}`;
  if (file.size > maxMb * 1024 * 1024) return `文件不能超过 ${maxMb}MB`;
  return "";
}
