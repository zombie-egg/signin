import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PermissionCode, UserProfile } from "../types/domain";
import { authApi } from "../lib/api";

interface AuthState {
  accessToken: string;
  refreshToken: string;
  user: UserProfile | null;
  setSession: (session: { accessToken: string; refreshToken: string; user: UserProfile }) => void;
  login: (username: string, password: string) => Promise<void>;
  hydrateMe: () => Promise<void>;
  logoutLocal: () => void;
  hasPermission: (permission?: PermissionCode) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: "",
      refreshToken: "",
      user: null,
      setSession: (session) => set(session),
      login: async (username, password) => {
        const result = await authApi.login({ username, password });
        set({ accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user });
      },
      hydrateMe: async () => {
        if (!get().accessToken) return;
        const user = await authApi.me();
        set({ user });
      },
      logoutLocal: () => set({ accessToken: "", refreshToken: "", user: null }),
      hasPermission: (permission) => {
        if (!permission) return true;
        const user = get().user;
        return Boolean(user?.permissions.includes(permission) || user?.roleCode === "SUPER_ADMIN");
      },
    }),
    {
      name: "e-sign-auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    },
  ),
);
