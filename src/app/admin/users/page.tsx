/**
 * Admin Users List Page
 * 
 * Search and select users for billing observation.
 * 
 * SYSTEM CONTRACT (ADMIN_UI_CONTRACT v1.0 §2):
 * - Route: /admin/users
 * - READ: GET /api/admin/users
 * - WRITE: none
 * - Forbidden: inline actions, mutations
 * 
 * @see docs/ui-contracts/system/ADMIN_UI_CONTRACT v1.0.md §2
 * @see SSOT_ADMIN_UI_PAGE_INVENTORY v1.0 §2.2
 */

import { AdminUsersClient } from "./_components/admin-users-client";

export default function AdminUsersPage() {
  return <AdminUsersClient />;
}
