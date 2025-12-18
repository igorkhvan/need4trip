/**
 * FieldCard Component
 * Universal card component for dynamic form fields (locations, custom fields, etc.)
 * 
 * Features:
 * - Consistent styling across all dynamic fields
 * - Optional index badge
 * - Optional locked state (cannot be deleted)
 * - Optional delete button
 * - Supports both bg-white and bg-subtle variants
 */

import * as React from "react";
import { Trash2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface FieldCardProps {
  /** Index number to display in badge (1-based) */
  index?: number;
  /** Custom badge content (overrides index) */
  badge?: React.ReactNode;
  /** Is this field locked? (shows lock icon, disables delete) */
  isLocked?: boolean;
  /** Lock message to show in tooltip */
  lockMessage?: string;
  /** Is this the first field? (prevents deletion) */
  isFirst?: boolean;
  /** First field deletion message */
  firstFieldMessage?: string;
  /** Delete handler (if undefined, delete button is hidden) */
  onDelete?: () => void;
  /** Is the delete button disabled? */
  deleteDisabled?: boolean;
  /** Card variant: 'white' or 'subtle' */
  variant?: "white" | "subtle";
  /** Additional className */
  className?: string;
  /** Card content */
  children: React.ReactNode;
}

export function FieldCard({
  index,
  badge,
  isLocked,
  lockMessage = "Поле используется и не может быть удалено",
  isFirst,
  firstFieldMessage = "Первое поле не может быть удалено",
  onDelete,
  deleteDisabled,
  variant = "subtle",
  className,
  children,
}: FieldCardProps) {
  const showDeleteButton = onDelete !== undefined;
  const canDelete = !isLocked && !isFirst && !deleteDisabled;

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        variant === "white" 
          ? "border-[#E5E7EB] bg-white shadow-sm" 
          : "border-[#E5E7EB] bg-[#F9FAFB]",
        isLocked && "border-[#FFF4EF] bg-[#FFFBF8]",
        className
      )}
    >
      {/* Header with badge and lock indicator */}
      {(badge !== undefined || index !== undefined || isLocked) && (
        <div className="mb-3 flex items-center gap-2">
          {/* Index badge or custom badge */}
          {(badge !== undefined || index !== undefined) && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FF6F2C]/10 text-xs font-semibold text-[#FF6F2C]">
              {badge ?? index}
            </div>
          )}

          {/* Locked indicator */}
          {isLocked && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-xs text-[#E86223]">
                    <Lock className="h-3.5 w-3.5" />
                    <span className="font-medium">Заблокировано</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>{lockMessage}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}

      {/* Card content */}
      <div className={cn("space-y-4", showDeleteButton && "relative")}>
        {children}

        {/* Delete button */}
        {showDeleteButton && (
          <div className="flex justify-end pt-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={canDelete ? onDelete : undefined}
                    disabled={!canDelete}
                    className={cn(
                      "h-8 w-8",
                      !canDelete && "cursor-not-allowed opacity-40"
                    )}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isLocked
                    ? lockMessage
                    : isFirst
                    ? firstFieldMessage
                    : "Удалить"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    </div>
  );
}
