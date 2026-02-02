/**
 * Admin Layout
 * 
 * Layout для Admin UI V0 (MANAGEMENT pages).
 * 
 * SYSTEM CONTRACT (ADMIN_UI_CONTRACT v1.0):
 * - Page Type: MANAGEMENT
 * - Layout: STANDARD width (max-w-7xl)
 * - Navigation: isolated from user navigation
 * 
 * @see docs/ui-contracts/system/ADMIN_UI_CONTRACT v1.0.md §1
 * @see SSOT_ADMIN_UI_PAGE_INVENTORY v1.0 §1.1
 */

import type { ReactNode } from "react";
import { AdminLayoutClient } from "./_components/admin-layout-client";

export const metadata = {
  title: "Admin | Need4Trip",
  description: "Admin Panel - Need4Trip",
  robots: "noindex, nofollow",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
