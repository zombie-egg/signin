import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import type {
  AuditLog,
  Contract,
  PageResult,
  PublicSignPayload,
  Seal,
  SignField,
  SignTask,
  StampPlacement,
  UserProfile,
} from "../types/domain";
import { useAuthStore } from "../stores/auth-store";

interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api";

export const api = axios.create({
  baseURL,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => {
    const payload = response.data as ApiEnvelope<unknown>;
    if (payload && typeof payload.code === "number" && payload.code !== 0) {
      return Promise.reject(new Error(payload.message || "接口返回业务错误"));
    }
    return payload?.data ?? response.data;
  },
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logoutLocal();
      window.location.assign("/login");
    }
    return Promise.reject(new Error(error.response?.data?.message || error.message));
  },
);

export async function request<T>(config: AxiosRequestConfig) {
  return api.request<unknown, T>(config);
}

export const authApi = {
  login: (data: { username: string; password: string }) =>
    request<{ accessToken: string; refreshToken: string; expiresIn: number; user: UserProfile }>({
      method: "POST",
      url: "/auth/login",
      data,
    }),
  me: () => request<UserProfile>({ method: "GET", url: "/auth/me" }),
  logout: () => request<void>({ method: "POST", url: "/auth/logout" }),
  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    request<{ ok: boolean }>({ method: "POST", url: "/auth/change-password", data }),
};

export const sealApi = {
  list: (params?: Record<string, unknown>) => request<PageResult<Seal>>({ method: "GET", url: "/seals", params }),
  create: (form: FormData) => request<Seal>({ method: "POST", url: "/seals", data: form }),
  updateStatus: (id: string, status: Seal["status"]) =>
    request<void>({ method: "PATCH", url: `/seals/${id}/status`, data: { status } }),
  remove: (id: string) => request<void>({ method: "DELETE", url: `/seals/${id}` }),
  usage: (id: string) => request<PageResult<AuditLog>>({ method: "GET", url: `/seals/${id}/usage` }),
  preview: (id: string) => request<{ url: string }>({ method: "GET", url: `/seals/${id}/preview` }),
};

export const contractApi = {
  list: (params?: Record<string, unknown>) => request<PageResult<Contract>>({ method: "GET", url: "/contracts", params }),
  create: (form: FormData) => request<Contract>({ method: "POST", url: "/contracts", data: form }),
  detail: (id: string) => request<Contract>({ method: "GET", url: `/contracts/${id}` }),
  file: (id: string) => request<{ url: string }>({ method: "GET", url: `/contracts/${id}/file` }),
  stamp: (id: string, stamps: StampPlacement[]) =>
    request<void>({ method: "POST", url: `/contracts/${id}/stamp`, data: { stamps } }),
  void: (id: string) => request<void>({ method: "POST", url: `/contracts/${id}/void` }),
};

export const signTaskApi = {
  list: (params?: Record<string, unknown>) =>
    request<PageResult<SignTask>>({ method: "GET", url: "/sign-tasks", params }),
  create: (data: {
    contractId: string;
    signerName: string;
    signerContact: string;
    deadline: string;
    fields: SignField[];
  }) => request<{ taskId: string; signUrl: string; expireAt: string }>({ method: "POST", url: "/sign-tasks", data }),
  detail: (id: string) => request<SignTask>({ method: "GET", url: `/sign-tasks/${id}` }),
  revoke: (id: string, reason: string) =>
    request<void>({ method: "POST", url: `/sign-tasks/${id}/revoke`, data: { reason } }),
  link: (id: string) => request<{ signUrl: string }>({ method: "GET", url: `/sign-tasks/${id}/link` }),
};

export const signApi = {
  detail: (token: string) => request<PublicSignPayload>({ method: "GET", url: `/sign/${token}` }),
  file: (token: string) => request<{ url: string }>({ method: "GET", url: `/sign/${token}/file` }),
  submit: (token: string, form: FormData) =>
    request<{ archiveUrl?: string; signedAt: string; sha256: string }>({
      method: "POST",
      url: `/sign/${token}/submit`,
      data: form,
    }),
};

export const auditApi = {
  list: (params?: Record<string, unknown>) => request<PageResult<AuditLog>>({ method: "GET", url: "/audit-logs", params }),
};
