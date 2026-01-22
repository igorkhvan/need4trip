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
 */

import { CreateEventPageClient } from "./create-event-client";

export const dynamic = "force-dynamic";

export default function CreateEventPage() {
  // SSOT_UI_STRUCTURE — No blocking awaits in CREATE page
  // All data fetching moved to client component for instant render
  return <CreateEventPageClient />;
}
