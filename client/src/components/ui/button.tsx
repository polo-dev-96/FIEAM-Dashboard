  import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-accent)]/30 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border border-[var(--ds-accent)]/25 bg-[var(--ds-accent)] text-white shadow-[0_12px_28px_rgba(0,159,227,.18)] hover:bg-[var(--ds-accent-hover)] hover:shadow-[0_16px_38px_rgba(0,159,227,.22)]",
        destructive: "border border-rose-500/20 bg-rose-500 text-white shadow-sm hover:bg-rose-600",
        outline: "border border-ds-default bg-ds-elevated text-ds-primary shadow-ds-card hover:border-ds-strong hover:bg-[var(--ds-accent-muted)]",
        secondary: "border border-ds-subtle bg-ds-inset text-ds-primary shadow-sm hover:border-ds-default hover:bg-[var(--ds-accent-muted)]",
        ghost: "border border-transparent bg-transparent text-ds-secondary hover:bg-[var(--ds-accent-muted)] hover:text-ds-primary",
      },
      size: {
        default: "min-h-10 px-4 py-2.5",
        sm: "min-h-8 rounded-lg px-3 text-xs",
        lg: "min-h-11 rounded-2xl px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
