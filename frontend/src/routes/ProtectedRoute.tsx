import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { PermissionCode } from "../types/domain";
import { useAuthStore } from "../stores/auth-store";

export function ProtectedRoute({ permission }: { permission?: PermissionCode }) {
  const location = useLocation();
  const { accessToken, hasPermission } = useAuthStore();
  if (!accessToken) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!hasPermission(permission)) return <Navigate to="/profile" replace />;
  return <Outlet />;
}
