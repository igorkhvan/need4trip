/**
 * Edit Event Page (Server Component)
 * 
 * SSOT_UI_STRUCTURE — EDIT page renders without server-side blocking
 * SSOT_UI_ASYNC_PATTERNS — data loads client-side, form temporarily disabled
 * 
 * Архитектура:
 * - Server: НЕТ blocking awaits — страница рендерится мгновенно
 * - Client: загружает event + user clubs + plan limits асинхронно
 * - Форма рендерится сразу, поля disabled пока данные загружаются
 * 
 * Паттерн: как CREATE page (instant render → client-side data loading)
 * 
 * Beta: passes isBetaMode prop for client-side participant limit enforcement
 * SSOT: docs/product/BETA_TEMPORARY_GATES_AND_DEVIATIONS.md §3.5
 */

import { EditEventPageClient } from "./edit-event-client";
import { isSoftBetaStrict } from "@/lib/config/paywall";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEventPage({ params }: PageProps) {
  // SSOT_UI_STRUCTURE — Only extract eventId, no blocking awaits
  const { id } = await params;
  
  // SSOT_UI_ASYNC_PATTERNS — All data fetching moved to client component for instant render
  // Beta: pass mode for UI-level participant limit enforcement
  return <EditEventPageClient eventId={id} isBetaMode={isSoftBetaStrict()} />;
}
