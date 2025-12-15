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
          "bg-[#FF6F2C] text-white hover:bg-[#E86223] disabled:bg-[#FECDB3] disabled:text-white disabled:opacity-100",
        secondary:
          "border-2 border-[#FF6F2C] bg-white text-[#FF6F2C] hover:bg-[#FFF4EF] disabled:border-[#FECDB3] disabled:text-[#FECDB3] disabled:bg-transparent disabled:opacity-100",
        outline:
          "border border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#F7F7F8] hover:border-[#D1D5DB] focus-visible:border-[var(--color-primary)]",
        ghost:
          "bg-transparent text-[#6B7280] hover:bg-[#F7F7F8] hover:text-[#111827] shadow-none",
        destructive:
          "bg-[#EF4444] text-white hover:bg-[#DC2626]",
        link: "text-[#FF6F2C] underline-offset-4 hover:underline shadow-none",
      },
      size: {
        default: "h-12 px-6",
        sm: "h-9 px-4 text-sm",
        lg: "h-14 px-8 text-lg",
        icon: "h-12 w-12",
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
