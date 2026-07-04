import { Badge } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import { label, sealStatusText, sealTypeText } from "../../lib/labels";
import type { Seal } from "../../types/domain";

export function SealCard({
  seal,
  canUpdate,
  canDelete,
  onToggle,
  onDelete,
  draggable = false,
}: {
  seal: Seal;
  canUpdate?: boolean;
  canDelete?: boolean;
  onToggle?: () => void;
  onDelete?: () => void;
  draggable?: boolean;
}) {
  return (
    <article
      draggable={draggable}
      onDragStart={(event) => event.dataTransfer.setData("application/seal-id", seal.id)}
      className="hover-hard grid gap-3 border border-ink bg-paper p-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="meta-label">{label(sealTypeText, seal.type) || "公章"}</p>
          <h3 className="font-display text-xl font-black">{seal.name}</h3>
        </div>
        <Badge tone={seal.status === "ENABLED" ? "black" : "red"}>{label(sealStatusText, seal.status)}</Badge>
      </div>
      <div className="halftone-placeholder grid aspect-square place-items-center border border-ink bg-divider">
        {seal.previewUrl ? <img src={seal.previewUrl} alt={seal.name} className="h-full w-full object-contain p-4" /> : <span className="meta-label">暂无预览</span>}
      </div>
      <div className="grid gap-2">
        <Button variant="secondary" disabled={!canUpdate} onClick={onToggle}>
          {seal.status === "ENABLED" ? "禁用" : "启用"}
        </Button>
        {onDelete ? (
          <Button variant="ghost" disabled={!canDelete} onClick={onDelete}>
            删除
          </Button>
        ) : null}
      </div>
    </article>
  );
}

