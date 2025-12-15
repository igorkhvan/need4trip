import * as React from "react";

import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          // Base styles
          "flex min-h-[96px] w-full rounded-xl bg-white px-4 py-3 text-[15px] text-[#1F2937]",
          // Border - thin and subtle
          "border border-[#E5E7EB]",
          // Hover state
          "hover:border-[#D1D5DB]",
          // Focus state - orange border only, no ring
          "focus:border-[var(--color-primary)] focus:outline-none",
          // Transition
          "transition-colors",
          // Placeholder
          "placeholder:text-[#6B7280]",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#F9FAFB]",
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
