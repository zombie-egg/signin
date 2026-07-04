import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Badge } from "../../components/atoms/Badge";
import { signTaskApi } from "../../lib/api";
import { formatDate } from "../../lib/utils";
import { label, taskStatusText } from "../../lib/labels";
import type { SignTask } from "../../types/domain";

export function SignTaskDetailPage() {
  const { id = "" } = useParams();
  const [task, setTask] = useState<SignTask | null>(null);

  useEffect(() => {
    if (!id) return;
    signTaskApi.detail(id).then(setTask).catch(() => setTask(null));
  }, [id]);

  return (
    <div className="p-4">
      <section className="ink-panel-heavy p-4">
        <p className="meta-label">签署任务 / {id}</p>
        <h2 className="section-title mt-2">{task?.contractName ?? "任务详情"}</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 max-md:grid-cols-1">
          <div className="border border-ink p-3">
            <p className="meta-label">签署人</p>
            <p className="font-display text-3xl font-black">{task?.signerName}</p>
            <p className="meta-value">{task?.signerContact}</p>
          </div>
          <div className="border border-ink p-3">
            <p className="meta-label">状态</p>
            <Badge tone={task?.status === "SIGNED" ? "black" : "red"}>{task?.status ? label(taskStatusText, task.status) : "-"}</Badge>
          </div>
          <div className="border border-ink p-3">
            <p className="meta-label">IP / 设备</p>
            <p className="font-mono text-xs">{task?.signedIp ?? "-"}</p>
            <p className="font-mono text-xs">{task?.signedDevice ?? "-"}</p>
          </div>
          <div className="border border-ink p-3">
            <p className="meta-label">签署时间</p>
            <p className="meta-value">{formatDate(task?.signedAt ?? task?.createdAt)}</p>
          </div>
          <div className="col-span-2 border border-ink p-3 max-md:col-span-1">
            <p className="meta-label">SHA256 哈希</p>
            <p className="break-all font-mono text-xs">{task?.sha256 ?? "等待归档哈希生成"}</p>
          </div>
          <div className="col-span-2 border border-ink p-3 max-md:col-span-1">
            <p className="meta-label">签署链接</p>
            <p className="break-all font-mono text-xs">{task?.signUrl ?? "-"}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
