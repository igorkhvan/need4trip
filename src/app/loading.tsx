/**
 * Global Loading Component
 * 
 * Показывается Next.js App Router во время загрузки страниц.
 * Использует брендированный spinner Need4Trip.
 * 
 * SSOT: docs/ssot/SSOT_ARCHITECTURE.md § 22 (UI State Model)
 */

import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-sm text-muted-foreground animate-pulse">
          Загрузка...
        </p>
      </div>
    </div>
  );
}

