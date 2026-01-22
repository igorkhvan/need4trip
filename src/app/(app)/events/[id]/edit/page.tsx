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
 */

import { EditEventPageClient } from "./edit-event-client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEventPage({ params }: PageProps) {
  // SSOT_UI_STRUCTURE — Only extract eventId, no blocking awaits
  const { id } = await params;
  
  // SSOT_UI_ASYNC_PATTERNS — All data fetching moved to client component for instant render
  return <EditEventPageClient eventId={id} />;
}
