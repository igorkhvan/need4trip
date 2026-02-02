/**
 * Admin Audit Log Page
 * 
 * Review admin actions and outcomes.
 * 
 * SYSTEM CONTRACT (ADMIN_UI_CONTRACT v1.0 §2):
 * - Route: /admin/audit
 * - READ: GET /api/admin/audit
 * - WRITE: none
 * - Forbidden: edit, replay, export
 * 
 * @see docs/ui-contracts/system/ADMIN_UI_CONTRACT v1.0.md §2
 * @see SSOT_ADMIN_UI_PAGE_INVENTORY v1.0 §2.6
 */

import { AdminAuditClient } from "./_components/admin-audit-client";

export default function AdminAuditPage() {
  return <AdminAuditClient />;
}
