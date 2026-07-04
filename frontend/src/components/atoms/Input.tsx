import * as React from "react";
import { cn } from "../../lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, label, error, ...props }, ref) => (
  <label className="block">
    {label ? <span className="meta-label mb-2 block">{label}</span> : null}
    <input
      ref={ref}
      className={cn(
        "sharp-corners h-11 w-full border-0 border-b-2 border-ink bg-transparent px-0 font-mono text-sm outline-none transition-all duration-200 ease-out placeholder:text-neutral-500 focus:bg-divider/40",
        className,
      )}
      {...props}
    />
    {error ? <span className="mt-2 block font-ui text-xs font-bold text-editorial">{error}</span> : null}
  </label>
));

Input.displayName = "Input";
