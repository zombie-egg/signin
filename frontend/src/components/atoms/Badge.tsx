import { cn } from "../../lib/utils";

export function Badge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: "neutral" | "red" | "black"; className?: string }) {
  return (
    <span
      className={cn(
        "sharp-corners inline-flex border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em]",
        tone === "red" && "border-editorial bg-editorial text-paper",
        tone === "black" && "border-ink bg-ink text-paper",
        tone === "neutral" && "border-ink bg-paper text-ink",
        className,
      )}
    >
      {children}
    </span>
  );
}
