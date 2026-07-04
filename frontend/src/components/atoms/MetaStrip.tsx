import { formatDate } from "../../lib/utils";

export function MetaStrip({ title }: { title: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-ink bg-paper px-4 py-3">
      <div>
        <p className="meta-label">内部电子签章归档</p>
        <h1 className="font-display text-2xl font-black uppercase leading-none md:text-4xl">{title}</h1>
      </div>
      <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-right">
        <span className="meta-label">版本</span>
        <span className="meta-value">{import.meta.env.VITE_APP_VERSION ?? "NEWSPRINT-0.1.0"}</span>
        <span className="meta-label">日期</span>
        <span className="meta-value">{formatDate(new Date())}</span>
      </div>
    </div>
  );
}
