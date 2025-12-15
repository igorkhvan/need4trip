import * as React from "react";

import { cn } from "@/lib/utils";

export type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement>;

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        type="checkbox"
        ref={ref}
        className={cn(
          // Base styles
          "h-4 w-4 rounded",
          // Border - thin
          "border border-[#E5E7EB]",
          // Accent color (checked state)
          "accent-[var(--color-primary)]",
          // Focus - no ring, just outline
          "focus:outline-[var(--color-primary)] focus:outline-offset-0",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Transition
          "transition-colors",
          className
        )}
        {...props}
      />
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
