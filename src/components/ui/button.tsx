import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-base font-semibold transition-all duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60 shadow-sm",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] disabled:bg-[#FECDB3] disabled:text-white disabled:opacity-100",
        secondary:
          "border-2 border-[var(--color-primary)] bg-white text-[var(--color-primary)] hover:bg-[var(--color-primary-bg)] disabled:border-[#FECDB3] disabled:text-[#FECDB3] disabled:bg-transparent disabled:opacity-100",
        outline:
          "border border-[var(--color-border)] bg-white text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] hover:border-[#D1D5DB] focus-visible:border-[var(--color-primary)]",
        ghost:
          "bg-transparent text-muted-foreground hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text)] shadow-none",
        "ghost-icon":
          "bg-transparent text-[var(--color-primary)] hover:bg-[var(--color-primary-bg)] hover:text-[var(--color-primary-hover)] shadow-none",
        destructive:
          "bg-[var(--color-danger)] text-white hover:bg-[#DC2626]",
        link: "text-[var(--color-primary)] underline-offset-4 hover:underline shadow-none",
      },
      size: {
        default: "h-12 px-4 sm:px-6",
        sm: "h-11 px-3 sm:px-4 text-sm",
        lg: "h-14 px-6 sm:px-8 text-lg",
        "icon-xs": "h-8 w-8",
        "icon-sm": "h-11 w-11",
        icon: "h-12 w-12",
        "icon-lg": "h-14 w-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
