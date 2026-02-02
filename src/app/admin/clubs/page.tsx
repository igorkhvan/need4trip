/**
 * Admin Clubs List Page
 * 
 * Search and select clubs for subscription observation.
 * 
 * SYSTEM CONTRACT (ADMIN_UI_CONTRACT v1.0 §2):
 * - Route: /admin/clubs
 * - READ: GET /api/admin/clubs
 * - WRITE: none
 * - Forbidden: plan changes, subscription activation/cancellation
 * 
 * @see docs/ui-contracts/system/ADMIN_UI_CONTRACT v1.0.md §2
 * @see SSOT_ADMIN_UI_PAGE_INVENTORY v1.0 §2.4
 */

import { AdminClubsClient } from "./_components/admin-clubs-client";

export default function AdminClubsPage() {
  return <AdminClubsClient />;
}
