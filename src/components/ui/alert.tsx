import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Alert({
  variant = "default",
  children,
  className,
}: {
  variant?: "default" | "destructive";
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        variant === "destructive"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-muted bg-muted/30 text-foreground",
        className
      )}
    >
      {children}
    </div>
  );
}

export function AlertTitle({ children }: { children: ReactNode }) {
  return <div className="font-semibold leading-tight">{children}</div>;
}

export function AlertDescription({ children }: { children: ReactNode }) {
  return <div className="text-sm">{children}</div>;
}
