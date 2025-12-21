/**
 * ActionCard Component
 * 
 * Universal card component for action sections (settings, danger zones, controls).
 * Provides consistent layout and styling for title + description + action button pattern.
 * 
 * Features:
 * - Responsive layout (column on mobile, row on desktop)
 * - Variant support (default, danger, warning)
 * - Flexible action slot (button, confirm dialog, toggle, etc.)
 * 
 * Usage:
 * ```tsx
 * <ActionCard
 *   variant="default"
 *   title="Close registration"
 *   description="Only you will be able to add participants"
 *   action={<Button onClick={handleClose}>Close</Button>}
 * />
 * ```
 */

import { cn } from "@/lib/utils";

export interface ActionCardProps {
  /**
   * Main title of the action
   */
  title: string;
  
  /**
   * Description explaining what the action does
   */
  description: string;
  
  /**
   * Action element (typically a Button or wrapped in ConfirmDialog)
   */
  action: React.ReactNode;
  
  /**
   * Visual variant affecting border and title color
   * @default "default"
   */
  variant?: "default" | "danger" | "warning";
  
  /**
   * Additional CSS classes for the container
   */
  className?: string;
}

export function ActionCard({
  title,
  description,
  action,
  variant = "default",
  className,
}: ActionCardProps) {
  // Variant-specific styles
  const borderClass = {
    default: "border-[var(--color-border)]",
    danger: "border-[var(--color-danger)]",
    warning: "border-[var(--color-warning)]",
  }[variant];

  const titleClass = {
    default: "text-[var(--color-text)]",
    danger: "text-[var(--color-danger)]",
    warning: "text-[var(--color-warning)]",
  }[variant];

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border bg-white p-4",
        "sm:flex-row sm:items-center sm:justify-between",
        borderClass,
        className
      )}
    >
      {/* Text Block */}
      <div className="flex-1">
        <p className={cn("font-medium", titleClass)}>{title}</p>
        <p className="text-sm text-[var(--color-text-muted)]">{description}</p>
      </div>

      {/* Action */}
      <div className="flex shrink-0 items-center gap-2">
        {action}
      </div>
    </div>
  );
}
