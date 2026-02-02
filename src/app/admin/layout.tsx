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
 * GLOBAL ADMIN GATE (UX POLISH):
 * - Non-admin users NEVER see Admin UI pages or navigation
 * - Admin users see the full Admin UI without per-page forbidden states
 * - Gate performs ONE server-side check via GET /api/admin/health
 * - HTTP 200 → render Admin layout + children
 * - HTTP 401/403/error → render "Not Authorized" screen
 * 
 * SECURITY (ADR-001, ADR-001.5):
 * - This is a UX-only gate, NOT a security boundary
 * - Real authorization happens at API routes via resolveAdminContext
 * - UI MUST NOT own secrets or perform auth logic
 * 
 * @see docs/ui-contracts/system/ADMIN_UI_CONTRACT v1.0.md §1
 * @see SSOT_ADMIN_UI_PAGE_INVENTORY v1.0 §1.1
 * @see SSOT_ARCHITECTURE.md §8.3 (Admin Context)
 */

import type { ReactNode } from "react";
import { internalApiGet } from "@/lib/http/internalApiFetch";
import { AdminLayoutClient } from "./_components/admin-layout-client";
import { AdminNotAuthorized } from "./_components/admin-not-authorized";

export const metadata = {
  title: "Admin | Need4Trip",
  description: "Admin Panel - Need4Trip",
  robots: "noindex, nofollow",
};

/**
 * Check if current user has admin access.
 * Uses /api/admin/health as the authoritative source.
 * 
 * @returns true if HTTP 200, false otherwise (401/403/network error)
 */
async function checkAdminAccess(): Promise<boolean> {
  try {
    const response = await internalApiGet('/api/admin/health');
    return response.ok; // 200 = authorized
  } catch {
    // Network error or other failure → treat as not authorized
    return false;
  }
}

/**
 * Admin Layout with Global Gate
 * 
 * This layout performs a single server-side admin access check.
 * 
 * - Authorized → full Admin UI (layout + navigation + children)
 * - Not authorized → neutral "Not Authorized" screen (no admin UI visible)
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  // =========================================================================
  // GLOBAL ADMIN GATE (UX ONLY)
  // =========================================================================
  // This check happens ONCE per layout render.
  // It determines whether to show Admin UI or "Not Authorized" screen.
  // This is NOT a security boundary — API routes enforce real authorization.
  // =========================================================================
  
  const isAuthorized = await checkAdminAccess();
  
  // Not authorized → show neutral "Not Authorized" screen
  // Non-admin users do NOT see admin navigation or pages
  if (!isAuthorized) {
    return <AdminNotAuthorized />;
  }
  
  // Authorized → show full Admin UI
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
