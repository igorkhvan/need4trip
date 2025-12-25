import { NextRequest } from "next/server";
import { getActiveEventCategories } from "@/lib/db/eventCategoryRepo";
import { log } from "@/lib/utils/logger";
import { respondSuccess, respondError } from "@/lib/api/response";

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

    return respondSuccess({ categories: dtoCategories }, undefined, 200, {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
    });
  } catch (error) {
    log.errorWithStack("Failed to fetch event categories", error);
    return respondError(error);
  }
}

// ⚡ Next.js Route Segment Config
// Revalidate this route every 1 hour (ISR)
export const revalidate = 3600;
