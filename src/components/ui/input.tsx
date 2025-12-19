import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles
          "flex h-12 w-full rounded-xl bg-white px-4 text-base text-[var(--color-text)]",
          // Border - thin and subtle
          "border border-[var(--color-border)]",
          // Hover state - subtle lightening
          "hover:border-[#D1D5DB]",
          // Focus state - orange border only, no ring
          "focus:border-[var(--color-primary)] focus:outline-none",
          // Transition for smooth color change
          "transition-colors",
          // Placeholder
          "placeholder:text-[var(--color-text-muted)]",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--color-bg-subtle)]",
          // File input
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
