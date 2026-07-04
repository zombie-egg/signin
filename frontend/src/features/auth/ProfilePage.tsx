import { useEffect, useState } from "react";
import { NewsTable } from "../../components/organisms/NewsTable";
import { auditApi } from "../../lib/api";
import { formatDate } from "../../lib/utils";
import { actionText, label, permissionText, roleText, targetTypeText } from "../../lib/labels";
import { useAuthStore } from "../../stores/auth-store";
import type { AuditLog } from "../../types/domain";

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    auditApi.list({ page: 1, pageSize: 8 }).then((result) => setLogs(result.list)).catch(() => setLogs([]));
  }, []);

  return (
    <div className="grid gap-4 p-4">
      <section className="ink-panel-heavy p-4">
        <p className="meta-label">个人中心</p>
        <h2 className="section-title mt-2">{user?.realName ?? "个人中心"}</h2>
        <dl className="mt-4 grid grid-cols-[120px_1fr] gap-y-3">
          <dt className="meta-label">用户名</dt>
          <dd className="meta-value">{user?.username}</dd>
          <dt className="meta-label">角色</dt>
          <dd className="meta-value">{label(roleText, user?.roleCode)}</dd>
          <dt className="meta-label">权限</dt>
          <dd className="text-xs">
            {user?.permissions.map((p) => label(permissionText, p)).join(" / ")}
          </dd>
        </dl>
      </section>
      <section className="ink-panel-heavy p-4">
        <h3 className="section-title">个人操作日志</h3>
        <div className="mt-4">
          <NewsTable
            rows={logs}
            columns={[
              { key: "time", title: "时间", render: (row) => <span className="meta-value">{formatDate(row.createdAt)}</span> },
              { key: "action", title: "操作", render: (row) => label(actionText, row.action) },
              { key: "target", title: "对象", render: (row) => <span className="text-xs">{label(targetTypeText, row.targetType)}/{row.targetId}</span> },
              { key: "ip", title: "IP", render: (row) => <span className="font-mono text-xs">{row.ip ?? "-"}</span> },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
