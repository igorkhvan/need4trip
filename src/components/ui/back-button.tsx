"use client";

/**
 * BackButton Component
 * 
 * SSOT_EVENTS_UX_V1.1 §4: Canonical navigation escape
 * SSOT_UI_STATES.md §6.2: Navigation escape required
 * 
 * Client component for proper browser history navigation.
 */

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button, ButtonProps } from "@/components/ui/button";

interface BackButtonProps extends Omit<ButtonProps, 'onClick'> {
  /** Fallback href if history is empty */
  fallbackHref?: string;
  /** Button label */
  label?: string;
  /** Show icon */
  showIcon?: boolean;
}

export function BackButton({
  fallbackHref = "/",
  label = "Назад",
  showIcon = true,
  ...props
}: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    // Check if there's history to go back to
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      // Fallback to specified href
      router.push(fallbackHref);
    }
  };

  return (
    <Button onClick={handleBack} {...props}>
      {showIcon && <ArrowLeft className="h-5 w-5" />}
      {label}
    </Button>
  );
}
