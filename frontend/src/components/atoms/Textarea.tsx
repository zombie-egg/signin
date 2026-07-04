import * as React from "react";
import { cn } from "../../lib/utils";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => (
    <label className="block">
      {label ? <span className="meta-label mb-2 block">{label}</span> : null}
      <textarea
        ref={ref}
        className={cn(
          "sharp-corners min-h-28 w-full border-2 border-ink bg-transparent p-3 font-body text-sm outline-none transition-all duration-200 ease-out placeholder:text-neutral-500 focus:bg-divider/40",
          className,
        )}
        {...props}
      />
      {error ? <span className="mt-2 block font-ui text-xs font-bold text-editorial">{error}</span> : null}
    </label>
  ),
);

Textarea.displayName = "Textarea";
