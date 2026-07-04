import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { NewsTable } from "../../components/organisms/NewsTable";
import { sealApi } from "../../lib/api";
import { formatDate } from "../../lib/utils";
import { actionText, label } from "../../lib/labels";
import type { AuditLog } from "../../types/domain";

export function SealDetailPage() {
  const { id = "" } = useParams();
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    if (!id) return;
    sealApi.usage(id).then((result) => setLogs(result.list)).catch(() => setLogs([]));
  }, [id]);

  return (
    <div className="grid gap-4 p-4">
      <section className="ink-panel-heavy p-4">
        <p className="meta-label">印章编号 / {id}</p>
        <h2 className="section-title mt-2">印章使用历史</h2>
        <div className="mt-4">
          <NewsTable
            rows={logs}
            columns={[
              { key: "time", title: "时间", render: (row) => <span className="meta-value">{formatDate(row.createdAt)}</span> },
              { key: "actor", title: "操作人", render: (row) => <span className="text-xs">{row.actorName}</span> },
              { key: "action", title: "操作", render: (row) => label(actionText, row.action) },
              { key: "target", title: "合同", render: (row) => <span className="font-mono text-xs">{row.targetId}</span> },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
