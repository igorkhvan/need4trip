/**
 * Global Loading Component
 * 
 * Показывается Next.js App Router во время загрузки страниц.
 * Использует брендированный spinner Need4Trip.
 * 
 * SSOT: docs/ssot/SSOT_ARCHITECTURE.md § 22 (UI State Model)
 */

import { Spinner } from "@/components/ui/spinner";

// SSOT: SSOT_UI_COPY §2.2 - Page/Section loading: ❌ No text
// FIX: Removed text "Загрузка...", spinner-only as per canonical pattern
export default function Loading() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

