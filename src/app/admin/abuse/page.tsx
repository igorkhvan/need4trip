/**
 * Admin Abuse / Anomaly Dashboard (RSC)
 *
 * READ-ONLY observability dashboard for abuse metrics.
 *
 * ARCHITECTURE (ADR-001.5 — MANDATORY):
 * - This is a React Server Component.
 * - Data is fetched by calling service-layer functions DIRECTLY.
 * - This page MUST NOT fetch /api/admin/* endpoints.
 * - Authentication is handled by the admin layout gate.
 *
 * ADR CONSTRAINTS (MANDATORY):
 * - DO NOT use resolveCurrentUser()
 * - DO NOT rely on cookies or implicit auth
 * - No mutations, no blocking, no suspension
 *
 * @see docs/adr/active/ADR-001.5.md
 * @see src/lib/services/adminAbuse.ts
 */

import { getAbuseOverview } from '@/lib/services/adminAbuse';
import { AbuseDashboardClient } from './_components/abuse-dashboard-client';

export default async function AdminAbusePage() {
  // =========================================================================
  // RSC → Service Layer (direct call, no HTTP hop)
  // Auth is handled by the parent admin layout gate.
  // =========================================================================
  const overview = await getAbuseOverview();

  return <AbuseDashboardClient data={overview} />;
}
