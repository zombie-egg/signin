import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "../atoms/Button";

export function Dialog({ title, trigger, children }: { title: string; trigger: React.ReactNode; children: React.ReactNode }) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <DialogPrimitive.Content className="sharp-corners fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(92vw,720px)] -translate-x-1/2 -translate-y-1/2 overflow-auto border-4 border-ink bg-paper">
          <div className="flex items-center justify-between border-b-4 border-ink p-4">
            <DialogPrimitive.Title className="font-display text-2xl font-black">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button size="icon" variant="ghost" aria-label="关闭弹窗">
                <X size={18} />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <div className="p-4">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
