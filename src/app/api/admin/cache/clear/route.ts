/**
 * Admin API: Clear Static Cache
 * 
 * Manually clears all static caches (plans, car brands, currencies, etc.)
 * Useful after database updates to force reload of cached data
 * 
 * Protected by middleware with ADMIN_SECRET header
 * 
 * Usage: POST /api/admin/cache/clear
 * Header: x-admin-secret: YOUR_SECRET
 */

import { NextRequest } from "next/server";
import { log } from "@/lib/utils/logger";
import { respondSuccess, respondError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // NOTE: Admin secret verified by middleware
    // This route should only be reachable if middleware passed
    
    // Dynamically import to avoid circular dependencies
    const { clearAllCaches, getAllCacheStats } = await import("@/lib/cache/staticCache");
    
    // Get stats before clearing
    const statsBefore = getAllCacheStats();
    
    // Clear all static caches
    clearAllCaches();
    
    log.info("Admin: All static caches cleared", {
      cacheCount: statsBefore.length,
      caches: statsBefore.map(s => s.name),
    });
    
    return respondSuccess({
      message: "All static caches cleared successfully",
      timestamp: new Date().toISOString(),
      clearedCaches: statsBefore.map(s => s.name),
    });
  } catch (error) {
    log.errorWithStack("Admin: Error clearing caches", error);
    return respondError(error);
  }
}
