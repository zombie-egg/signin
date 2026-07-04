import { Eraser } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "../atoms/Button";

export function SignaturePad({ onChange }: { onChange: (file: File | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function exportPng() {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return onChange(null);
      onChange(new File([blob], "signature.png", { type: "image/png" }));
    }, "image/png");
  }

  return (
    <div className="border border-ink">
      <div className="flex items-center justify-between border-b border-ink p-2">
        <span className="meta-label">手写签名</span>
        <Button
          size="sm"
          variant="ghost"
          type="button"
          onClick={() => {
            const canvas = canvasRef.current;
            const context = canvas?.getContext("2d");
            if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
            onChange(null);
          }}
        >
          <Eraser size={16} />
          清除
        </Button>
      </div>
      <canvas
        ref={canvasRef}
        width={720}
        height={240}
        className="block h-48 w-full touch-none bg-paper"
        onPointerDown={(event) => {
          const context = event.currentTarget.getContext("2d");
          const p = point(event);
          context?.beginPath();
          context?.moveTo(p.x * 2, p.y * 2);
          setDrawing(true);
        }}
        onPointerMove={(event) => {
          if (!drawing) return;
          const context = event.currentTarget.getContext("2d");
          const p = point(event);
          if (!context) return;
          context.strokeStyle = "#111111";
          context.lineWidth = 4;
          context.lineCap = "square";
          context.lineTo(p.x * 2, p.y * 2);
          context.stroke();
        }}
        onPointerUp={() => {
          setDrawing(false);
          exportPng();
        }}
      />
    </div>
  );
}
