/**
 * Create Event Page (Server Component)
 * 
 * SSOT_UI_STRUCTURE — CREATE page renders without server-side blocking
 * SSOT_UI_ASYNC_PATTERNS — optimistic client-side data loading
 * 
 * Архитектура:
 * - Server: НЕТ blocking awaits — страница рендерится мгновенно
 * - Client: загружает user clubs + plan limits асинхронно
 * - Форма рендерится сразу (optimistic UI)
 * 
 * Beta: passes isBetaMode prop for client-side participant limit enforcement
 * SSOT: docs/product/BETA_TEMPORARY_GATES_AND_DEVIATIONS.md §3.5
 */

import { CreateEventPageClient } from "./create-event-client";
import { isSoftBetaStrict } from "@/lib/config/paywall";

export const dynamic = "force-dynamic";

export default function CreateEventPage() {
  // SSOT_UI_STRUCTURE — No blocking awaits in CREATE page
  // All data fetching moved to client component for instant render
  // Beta: pass mode for UI-level participant limit enforcement
  return <CreateEventPageClient isBetaMode={isSoftBetaStrict()} />;
}
