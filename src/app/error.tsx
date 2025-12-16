"use client";

/**
 * Global Error Handler
 * 
 * Обрабатывает ошибки на уровне корневого layout.
 * Автоматически используется Next.js App Router.
 */

import { useEffect } from "react";
import { ErrorFallback } from "@/components/error-boundary";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global error:", error);
  }, [error]);

  return <ErrorFallback error={error} reset={reset} />;
}
