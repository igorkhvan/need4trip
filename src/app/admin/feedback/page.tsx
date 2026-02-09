/**
 * Admin Feedback Page (RSC)
 *
 * READ-ONLY feedback dashboard for admin users.
 *
 * ARCHITECTURE (ADR-001.5 — MANDATORY):
 * - This is a React Server Component.
 * - Data is fetched by calling service-layer functions DIRECTLY.
 * - This page MUST NOT fetch /api/admin/* endpoints.
 * - Authentication is handled by the admin layout gate.
 *
 * @see docs/adr/active/ADR-001.5.md
 * @see src/lib/services/feedbackService.ts
 */

import { getAdminFeedback } from '@/lib/services/feedbackService';
import { FeedbackTableClient } from './_components/feedback-table-client';

export default async function AdminFeedbackPage() {
  // =========================================================================
  // RSC → Service Layer (direct call, no HTTP hop)
  // Auth is handled by the parent admin layout gate.
  // =========================================================================
  const result = await getAdminFeedback({ limit: 50 });

  return <FeedbackTableClient initialData={result} />;
}
