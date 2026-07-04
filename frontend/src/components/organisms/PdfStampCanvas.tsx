import { useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Button } from "../atoms/Button";
import type { Seal, SignField, StampPlacement } from "../../types/domain";

// worker 与 react-pdf 内部 pdfjs 版本必须一致，否则 pdf.js 报 "API version does not match Worker version"。
// 通过 ?url 让 Vite 本地打包 worker（离线可用），并已将 pdfjs-dist 版本对齐到 react-pdf 所用版本。
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

// 画布内元素：企业印章(seal) 或 签名框(field)
interface PlacedItem {
  id: string;
  kind: "seal" | "field";
  sealId?: string; // kind=seal 时有效
  name?: string;
  previewUrl?: string;
  page: number;
  posX: number;
  posY: number;
  width: number;
  height: number;
}

// 拖拽数据类型标记
const DT_SEAL = "application/seal-id";
const DT_FIELD = "application/sign-field";
const DT_ITEM = "application/item-id";

function normalizeObjectUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.pathname.startsWith("/esign/")) {
      return `${window.location.origin}${url.pathname}`;
    }
  } catch {
    // Keep relative URLs as-is.
  }
  return value;
}

export function PdfStampCanvas({
  fileUrl,
  activeSeals,
  onChange,
  onFieldsChange,
}: {
  fileUrl?: string;
  activeSeals?: Seal[];
  onChange?: (stamps: StampPlacement[]) => void; // 企业印章坐标
  onFieldsChange?: (fields: SignField[]) => void; // 签名框坐标
}) {
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [items, setItems] = useState<PlacedItem[]>([]);
  const [pdfError, setPdfError] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const sealMap = useMemo(() => new Map(activeSeals?.map((seal) => [seal.id, seal]) ?? []), [activeSeals]);
  const normalizedFileUrl = normalizeObjectUrl(fileUrl);

  function sync(next: PlacedItem[]) {
    setItems(next);
    // 企业印章
    onChange?.(
      next
        .filter((it) => it.kind === "seal" && it.sealId)
        .map((it) => ({
          sealId: it.sealId as string,
          page: it.page,
          posX: it.posX,
          posY: it.posY,
          width: it.width,
          height: it.height,
        })),
    );
    // 签名框
    onFieldsChange?.(
      next
        .filter((it) => it.kind === "field")
        .map((it) => ({
          fieldType: 2,
          page: it.page,
          posX: it.posX,
          posY: it.posY,
          width: it.width,
          height: it.height,
        })),
    );
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    const posX = Math.round((event.clientX - rect.left) / scale);
    const posY = Math.round((event.clientY - rect.top) / scale);

    // A. 移动已放置的元素
    const movingId = event.dataTransfer.getData(DT_ITEM);
    if (movingId) {
      sync(items.map((it) => (it.id === movingId ? { ...it, posX, posY, page } : it)));
      return;
    }

    // B. 从印章库拖入企业印章
    const sealId = event.dataTransfer.getData(DT_SEAL);
    if (sealId) {
      const seal = sealMap.get(sealId);
      if (!seal) return; // 必须是真实印章
      sync([
        ...items,
        { id: crypto.randomUUID(), kind: "seal", sealId, name: seal.name, previewUrl: normalizeObjectUrl(seal.previewUrl), page, posX, posY, width: 120, height: 120 },
      ]);
      return;
    }

    // C. 拖入签名框
    const isField = event.dataTransfer.getData(DT_FIELD);
    if (isField) {
      sync([
        ...items,
        { id: crypto.randomUUID(), kind: "field", name: "签名", page, posX, posY, width: 160, height: 60 },
      ]);
      return;
    }
  }

  return (
    <section className="ink-panel-heavy bg-paper">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-4 border-ink p-3">
        <p className="meta-label">PDF 预览 / 第 {page} 页</p>
        <div className="flex items-center gap-2">
          {/* 仅在可编辑签名框时(盖章页)显示拖拽源 */}
          {onFieldsChange ? (
            <span
              draggable
              onDragStart={(event) => event.dataTransfer.setData(DT_FIELD, "1")}
              className="cursor-grab select-none border-2 border-blue-600 bg-paper px-2 py-1 font-ui text-xs font-bold text-blue-700"
              title="拖到 PDF 上放置签名位置"
            >
              ✍ 拖拽放置签名框
            </span>
          ) : null}
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
            上页
          </Button>
          <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>
            下页
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setScale((value) => Math.max(0.6, value - 0.1))}>
            -
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setScale((value) => Math.min(1.8, value + 0.1))}>
            +
          </Button>
        </div>
      </div>
      <div
        className="relative min-h-[70vh] overflow-auto bg-neutral-200 p-4"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        {normalizedFileUrl ? (
          <div className="relative mx-auto w-fit border border-ink bg-paper">
            {pdfError ? (
              <iframe
                title="PDF 预览"
                src={normalizedFileUrl}
                className="h-[78vh] w-[72vw] min-w-[720px] border-0 bg-paper"
              />
            ) : (
              <Document
                key={normalizedFileUrl}
                file={normalizedFileUrl}
                onLoadSuccess={({ numPages }) => {
                  setPages(numPages);
                  setPdfError(false);
                }}
                onLoadError={() => setPdfError(true)}
                onSourceError={() => setPdfError(true)}
                loading={<p className="meta-label p-8">PDF 加载中</p>}
              >
                <Page pageNumber={page} scale={scale} renderTextLayer={false} renderAnnotationLayer={false} />
              </Document>
            )}
            <div ref={overlayRef} className="absolute inset-0">
              {items
                .filter((item) => item.page === page)
                .map((item) => (
                  <button
                    key={item.id}
                    className={
                      "group absolute grid place-items-center overflow-hidden border-2 font-mono text-[10px] font-bold " +
                      (item.kind === "seal"
                        ? "border-editorial bg-paper/60 text-editorial"
                        : "border-dashed border-blue-600 bg-blue-50/70 text-blue-700")
                    }
                    style={{
                      left: item.posX * scale,
                      top: item.posY * scale,
                      width: item.width * scale,
                      height: item.height * scale,
                    }}
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData(DT_ITEM, item.id)}
                    onClick={() => sync(items.filter((candidate) => candidate.id !== item.id))}
                    title="拖动可移动，点击删除"
                  >
                    {item.kind === "seal" && item.previewUrl ? (
                      <img src={item.previewUrl} alt={item.name} className="h-full w-full object-contain p-0.5" draggable={false} />
                    ) : (
                      <span className="px-1">{item.kind === "field" ? "签名位置" : item.name}</span>
                    )}
                  </button>
                ))}
            </div>
          </div>
        ) : (
          <div className="grid min-h-[60vh] place-items-center border border-ink bg-paper">
            <p className="meta-label">等待 PDF 链接</p>
          </div>
        )}
      </div>
    </section>
  );
}
