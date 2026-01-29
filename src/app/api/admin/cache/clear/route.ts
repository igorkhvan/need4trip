/**
 * Admin API: Clear Static Cache
 * 
 * Manually clears all static caches (plans, car brands, currencies, etc.)
 * Useful after database updates to force reload of cached data
 * 
 * Authentication: AdminContext via shared-secret (x-admin-secret header)
 * Authorization: None (all admins have equal access - Phase 1)
 * 
 * Usage: POST /api/admin/cache/clear
 * Header: x-admin-secret: YOUR_SECRET
 * 
 * @see docs/adr/ADR-001.2.md
 */

import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/utils/logger";
import { respondSuccess, respondError } from "@/lib/api/response";
import { resolveAdminContext } from "@/lib/auth/resolveAdminContext";

export const dynamic = "force-dynamic";

/**
 * Audit log for admin action
 * 
 * Logs only non-sensitive information per ADR-001.2 §5.2:
 * - action name
 * - timestamp
 * - request path
 * - result (success/failure)
 * 
 * Does NOT log: secrets, headers, payload contents
 */
function auditAdminAction(
  action: string,
  path: string,
  result: 'success' | 'failure',
  context?: Record<string, unknown>
): void {
  log.info(`[ADMIN AUDIT] ${action}`, {
    action,
    timestamp: new Date().toISOString(),
    path,
    result,
    ...context,
  });
}

export async function POST(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // =========================================================================
  // 1. Explicit AdminContext resolution (ADR-001.2 §3.3)
  // =========================================================================
  const adminContext = resolveAdminContext(request);
  
  if (!adminContext) {
    // Do NOT audit failed auth attempts to avoid log flooding
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Invalid admin credentials',
        },
      },
      { status: 403 }
    );
  }
  
  // =========================================================================
  // 2. Execute admin action
  // =========================================================================
  try {
    // Dynamically import to avoid circular dependencies
    const { clearAllCaches, getAllCacheStats } = await import("@/lib/cache/staticCache");
    
    // Get stats before clearing
    const statsBefore = getAllCacheStats();
    
    // Clear all static caches
    clearAllCaches();
    
    // =========================================================================
    // 3. Audit logging (MANDATORY per ADR-001.2 §5.1)
    // =========================================================================
    auditAdminAction(
      'admin.cache.clear',
      path,
      'success',
      {
        cacheCount: statsBefore.length,
        caches: statsBefore.map(s => s.name),
      }
    );
    
    return respondSuccess({
      message: "All static caches cleared successfully",
      timestamp: new Date().toISOString(),
      clearedCaches: statsBefore.map(s => s.name),
    });
  } catch (error) {
    // Audit failure
    auditAdminAction(
      'admin.cache.clear',
      path,
      'failure',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
    
    log.errorWithStack("Admin: Error clearing caches", error);
    return respondError(error);
  }
}
