import * as React from "react";

import { cn } from "@/lib/utils";

export type ToastProps = React.HTMLAttributes<HTMLDivElement>;

export const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "pointer-events-auto flex w-full max-w-sm rounded-lg border bg-background/95 p-4 shadow-lg backdrop-blur",
          className
        )}
        {...props}
      />
    );
  }
);
Toast.displayName = "Toast";
