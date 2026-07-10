import { Download, Eye, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../../components/atoms/Badge";
import { Button } from "../../components/atoms/Button";
import { Input } from "../../components/atoms/Input";
import { NewsTable } from "../../components/organisms/NewsTable";
import { signTaskApi } from "../../lib/api";
import { formatDate } from "../../lib/utils";
import { label, taskStatusText } from "../../lib/labels";
import { useAuthStore } from "../../stores/auth-store";
import type { SignTask } from "../../types/domain";

export function SignTasksPage() {
  const [tasks, setTasks] = useState<SignTask[]>([]);
  const hasPermission = useAuthStore((state) => state.hasPermission);

  function load(params?: Record<string, unknown>) {
    signTaskApi.list({ page: 1, pageSize: 20, ...params }).then((result) => setTasks(result.list)).catch(() => setTasks([]));
  }

  useEffect(() => load(), []);

  return (
    <div className="grid gap-4 p-4">
      <section className="ink-panel-heavy">
        <div className="border-b-4 border-ink p-4">
          <p className="meta-label">签署任务台账</p>
          <h2 className="section-title border-b-0 pb-0">签署任务列表</h2>
        </div>
        <form
          className="grid grid-cols-4 gap-3 border-b border-ink p-3 max-md:grid-cols-1"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            load({
              status: form.get("status"),
              signerName: form.get("signerName"),
              startDate: form.get("startDate"),
            });
          }}
        >
          <Input label="状态" name="status" />
          <Input label="签署人" name="signerName" />
          <Input label="起始日期" name="startDate" type="date" />
          <Button type="submit" variant="secondary">筛选</Button>
        </form>
        <NewsTable
          rows={tasks}
          columns={[
            { key: "contract", title: "合同", render: (row) => <span className="font-display text-lg font-black">{row.contractName ?? row.contractId}</span> },
            { key: "signer", title: "签署人", render: (row) => row.signerName },
            { key: "deadline", title: "截止时间", render: (row) => <span className="meta-value">{formatDate(row.deadline)}</span> },
            { key: "status", title: "状态", render: (row) => <Badge tone={row.status === "SIGNED" ? "black" : "red"}>{label(taskStatusText, row.status)}</Badge> },
            {
              key: "action",
              title: "操作",
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="secondary">
                    <Link to={`/sign-tasks/${row.id}`}>
                      <Eye size={14} />
                      详情
                    </Link>
                  </Button>
                  <Button size="sm" variant="ghost" disabled={!hasPermission("signtask:revoke") || row.status !== "PENDING"} onClick={() => signTaskApi.revoke(row.id, "前端撤回").then(() => load())}>
                    <RotateCcw size={14} />
                    撤回
                  </Button>
                  <Button size="sm" variant="ghost" disabled={row.status !== "SIGNED"}>
                    <Download size={14} />
                    归档
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="hover:border-editorial hover:bg-editorial hover:text-paper"
                    disabled={!hasPermission("signtask:delete")}
                    onClick={() => {
                      if (!window.confirm(`确认删除「${row.contractName ?? row.contractId}」的签署任务？`)) return;
                      signTaskApi.remove(row.id).then(() => load());
                    }}
                  >
                    <Trash2 size={14} />
                    删除
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </section>
    </div>
  );
}
