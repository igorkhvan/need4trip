import { listCarBrands } from "@/lib/db/carBrandRepo";
import { log } from "@/lib/utils/logger";
import { respondSuccess, respondError } from "@/lib/api/response";

/**
 * GET /api/car-brands
 * 
 * List all car brands
 * Public endpoint (no auth required)
 * 
 * ⚡ PERFORMANCE: Cached for 1 hour
 * - CDN/Browser cache: 1 hour
 * - Stale-while-revalidate: 24 hours
 */
export async function GET() {
  try {
    const brands = await listCarBrands();
    
    return respondSuccess({ brands }, undefined, 200, {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
    });
  } catch (err) {
    log.warn("Failed to list car brands, returning empty array", { error: err });
    return respondSuccess({ brands: [] }, undefined, 200);
  }
}

// ⚡ Next.js Route Segment Config
// Revalidate this route every 1 hour (ISR)
export const revalidate = 3600;
