import * as React from "react";

import { cn } from "@/lib/utils";

type ChipVariant = "primary" | "success" | "outline";

interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant;
}

const variantClasses: Record<ChipVariant, string> = {
  primary: "bg-[#FFF4EF] text-[#E86223]",
  success: "bg-[#F0FDF4] text-[#16A34A]",
  outline: "border border-[#E5E7EB] text-[#374151]",
};

export function Chip({ variant = "outline", className, ...props }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
