/**
 * Admin API: Health Check
 * 
 * Sanity check for admin authentication.
 * Returns { ok: true } if admin is authenticated.
 * 
 * @see SSOT_ADMIN_UI_PAGE_INVENTORY v1.0 §2.1
 * @see ADR-001.2 (Admin Context)
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveAdminContext } from "@/lib/auth/resolveAdminContext";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/health
 * 
 * Returns: { success: true, data: { ok: true } }
 * Error: 403 if not authenticated as admin
 */
export async function GET(request: NextRequest) {
  // =========================================================================
  // 1. Resolve Admin Context (MANDATORY)
  // =========================================================================
  const adminContext = resolveAdminContext(request);
  
  if (!adminContext) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Invalid admin credentials",
        },
      },
      { status: 403 }
    );
  }
  
  // =========================================================================
  // 2. Return success
  // =========================================================================
  return NextResponse.json({
    success: true,
    data: {
      ok: true,
      timestamp: new Date().toISOString(),
    },
  });
}
