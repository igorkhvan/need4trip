import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Простой HTML select с дизайном из системы
 * Использует нативный <select> для совместимости с <option>
 */
export interface SimpleSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const SimpleSelect = React.forwardRef<HTMLSelectElement, SimpleSelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "flex h-12 w-full items-center justify-between rounded-xl border-2 border-[#E5E7EB] bg-white px-4 text-sm ring-offset-background",
          "focus:outline-none focus:ring-2 focus:ring-[#FF6F2C]/60 focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);
SimpleSelect.displayName = "SimpleSelect";

export { SimpleSelect };

