import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 disabled:pointer-events-none ring-offset-background shadow-sm",
  {
    variants: {
      variant: {
        default:
          "bg-[#FF6F2C] text-white hover:bg-[#E86223] disabled:bg-[#FECDB3] disabled:text-white disabled:opacity-100",
        secondary:
          "border-2 border-[#FF6F2C] bg-white text-[#FF6F2C] hover:bg-[#FFF4EF] disabled:border-[#FECDB3] disabled:text-[#FECDB3] disabled:bg-transparent disabled:opacity-100",
        outline:
          "border-2 border-border bg-white text-foreground hover:bg-muted/50",
        ghost:
          "bg-transparent text-[#0F172A] hover:bg-[#F5F7FB] hover:text-[#0F172A]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "text-[#FF6F2C] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-5",
        sm: "h-10 px-4 text-sm",
        lg: "h-14 px-6 text-base",
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
