import { NextRequest, NextResponse } from "next/server";
import { getActiveEventCategories } from "@/lib/db/eventCategoryRepo";
import { log } from "@/lib/utils/logger";

/**
 * GET /api/event-categories
 * Returns list of active event categories
 * Public endpoint (no auth required)
 * 
 * ⚡ PERFORMANCE: Cached for 1 hour
 * - CDN/Browser cache: 1 hour
 * - Stale-while-revalidate: 24 hours
 */
export async function GET(req: NextRequest) {
  try {
    const categories = await getActiveEventCategories();
    
    // Return DTO format (only needed fields for client)
    const dtoCategories = categories.map(cat => ({
      id: cat.id,
      code: cat.code,
      nameRu: cat.nameRu,
      nameEn: cat.nameEn,
      icon: cat.icon,
      isDefault: cat.isDefault,
    }));

    const response = NextResponse.json({ categories: dtoCategories });
    
    // ⚡ HTTP Cache Headers for CDN and Browser
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=3600, stale-while-revalidate=86400'
    );
    
    return response;
  } catch (error) {
    log.errorWithStack("Failed to fetch event categories", error);
    return NextResponse.json(
      { error: "Failed to fetch event categories" },
      { status: 500 }
    );
  }
}

// ⚡ Next.js Route Segment Config
// Revalidate this route every 1 hour (ISR)
export const revalidate = 3600;
