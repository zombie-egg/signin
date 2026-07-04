import { LogOut } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "../components/atoms/Button";
import { MetaStrip } from "../components/atoms/MetaStrip";
import { navItems } from "../lib/permissions";
import { useAuthStore } from "../stores/auth-store";
import { cn } from "../lib/utils";
import { label, roleText } from "../lib/labels";

export function AppLayout() {
  const navigate = useNavigate();
  const { user, hasPermission, logoutLocal } = useAuthStore();
  const visibleNav = navItems.filter((item) => hasPermission(item.permission));

  return (
    <div className="newsprint-page">
      <MetaStrip title="企业电子签章系统" />
      <div className="mobile-stack grid min-h-[calc(100vh-88px)] grid-cols-[260px_1fr]">
        <aside className="border-r-4 border-ink bg-paper">
          <div className="border-b-4 border-ink p-4">
            <p className="meta-label">当前登录</p>
            <p className="font-display text-2xl font-black">{user?.realName ?? user?.username ?? "未登录"}</p>
            <p className="meta-value">{user?.roleCode ? label(roleText, user.roleCode) : "无角色"}</p>
          </div>
          <nav className="grid">
            {visibleNav.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "border-b border-ink px-4 py-4 font-ui text-xs font-extrabold uppercase tracking-[0.16em] transition-all duration-200 ease-out hover:bg-ink hover:text-paper",
                    isActive && "bg-ink text-paper",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="p-4">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                logoutLocal();
                navigate("/login");
              }}
            >
              <LogOut size={16} />
              退出
            </Button>
          </div>
        </aside>
        <main className="bg-paper/75">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
