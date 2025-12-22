/**
 * FormField Component
 * Universal wrapper for form inputs with inline validation
 * 
 * Features:
 * - Inline error display (no reserved space)
 * - Smooth animation for error appearance
 * - Error icon for better visibility
 * - Automatic error attribute for scroll targeting
 */

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export interface FormFieldProps {
  /** Unique field identifier for error targeting */
  id: string;
  /** Field label text */
  label?: string;
  /** Is this field required? Shows asterisk */
  required?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Additional hint text (always visible) */
  hint?: string;
  /** Container className */
  className?: string;
  /** Children (input element) */
  children: React.ReactNode;
}

export function FormField({
  id,
  label,
  required,
  error,
  hint,
  className,
  children,
}: FormFieldProps) {
  const hasError = !!error;

  return (
    <div
      className={cn("space-y-2", className)}
      data-field-id={id}
      data-error={hasError || undefined}
    >
      {label && (
        <Label htmlFor={id} className="text-sm font-medium text-[#111827]">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </Label>
      )}

      {children}

      {/* Error message - appears without reserved space */}
      {hasError && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 animate-in slide-in-from-top-1 duration-200">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Hint text - always visible if provided */}
      {hint && !hasError && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
