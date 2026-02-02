/**
 * Admin Club Detail Page
 * 
 * Detailed subscription inspection for a single club.
 * 
 * SYSTEM CONTRACT (ADMIN_UI_CONTRACT v1.0 §2):
 * - Route: /admin/clubs/[clubId]
 * - READ: GET /api/admin/clubs/:clubId
 * - WRITE: POST /api/admin/clubs/:clubId/extend-subscription
 * - Forbidden: plan changes, state changes, activation/cancellation actions
 * 
 * @see docs/ui-contracts/system/ADMIN_UI_CONTRACT v1.0.md §2
 * @see SSOT_ADMIN_UI_PAGE_INVENTORY v1.0 §2.5
 */

import { AdminClubDetailClient } from "./_components/admin-club-detail-client";

interface PageProps {
  params: Promise<{ clubId: string }>;
}

export default async function AdminClubDetailPage({ params }: PageProps) {
  const { clubId } = await params;
  return <AdminClubDetailClient clubId={clubId} />;
}
