import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "sharp-corners inline-flex min-h-11 items-center justify-center gap-2 border border-ink px-4 py-2 font-ui text-xs font-extrabold uppercase tracking-[0.16em] transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        primary: "bg-ink text-paper hover:bg-paper hover:text-ink",
        secondary: "bg-paper text-ink hover:bg-ink hover:text-paper",
        ghost: "border-transparent bg-transparent text-ink hover:border-ink hover:bg-ink hover:text-paper",
        link: "min-h-0 border-transparent bg-transparent p-0 text-ink underline decoration-transparent decoration-4 underline-offset-4 hover:text-editorial hover:decoration-editorial",
      },
      size: {
        sm: "min-h-11 px-3 text-[10px]",
        md: "min-h-11 px-4",
        lg: "min-h-12 px-6",
        icon: "h-11 w-11 px-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);

Button.displayName = "Button";
