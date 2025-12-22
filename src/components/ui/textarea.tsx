import * as React from "react";

import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          // Base styles
          "flex min-h-[96px] w-full rounded-xl bg-white px-4 py-3 text-base text-[var(--color-text)]",
          // Border - thin and subtle
          "border border-[var(--color-border)]",
          // Hover state
          "hover:border-[#D1D5DB]",
          // Focus state - orange border only, no ring
          "focus:border-[var(--color-primary)] focus:outline-none",
          // Transition
          "transition-colors",
          // Placeholder
          "placeholder:text-muted-foreground",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--color-bg-subtle)]",
          // Resize
          "resize-none",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
