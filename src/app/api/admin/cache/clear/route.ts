/**
 * Admin API: Clear Static Cache
 * 
 * Manually clears all static caches (plans, car brands, currencies, etc.)
 * Useful after database updates to force reload of cached data
 * 
 * Usage: POST /api/admin/cache/clear
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Dynamically import to avoid circular dependencies
    const { clearAllCaches } = await import("@/lib/cache/staticCache");
    
    // Clear all static caches
    clearAllCaches();
    
    return NextResponse.json({
      success: true,
      data: {
        message: "All static caches cleared successfully",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[Cache Clear] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Failed to clear cache",
        },
      },
      { status: 500 }
    );
  }
}
