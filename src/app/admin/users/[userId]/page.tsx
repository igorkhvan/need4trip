/**
 * Admin User Detail Page
 * 
 * Detailed billing inspection for a single user.
 * 
 * SYSTEM CONTRACT (ADMIN_UI_CONTRACT v1.0 §2):
 * - Route: /admin/users/[userId]
 * - READ: GET /api/admin/users/:userId
 * - WRITE: POST /api/admin/users/:userId/grant-credit
 * - Forbidden: any other mutation, inline submit
 * 
 * @see docs/ui-contracts/system/ADMIN_UI_CONTRACT v1.0.md §2
 * @see SSOT_ADMIN_UI_PAGE_INVENTORY v1.0 §2.3
 */

import { AdminUserDetailClient } from "./_components/admin-user-detail-client";

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { userId } = await params;
  return <AdminUserDetailClient userId={userId} />;
}
