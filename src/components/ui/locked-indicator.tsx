/**
 * LockedIndicator Component
 * 
 * Reusable indicator for locked/disabled state with lock icon
 * Used across the app for consistent locked state visualization
 * 
 * Examples:
 * - Event registration closed by owner
 * - Custom field locked (participants exist)
 * - Past event toggle disabled
 */

import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LockedIndicatorProps {
  /** Message to display next to lock icon */
  message: string;
  /** Additional className */
  className?: string;
  /** Icon size variant */
  size?: "sm" | "md";
}

export function LockedIndicator({ 
  message, 
  className,
  size = "sm"
}: LockedIndicatorProps) {
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  
  return (
    <div className={cn(
      "flex items-center gap-1.5 text-xs text-[#E86223]",
      className
    )}>
      <Lock className={iconSize} />
      <span className="font-medium">{message}</span>
    </div>
  );
}
