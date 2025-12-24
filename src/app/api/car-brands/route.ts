import { NextResponse } from "next/server";

import { listCarBrands } from "@/lib/db/carBrandRepo";
import { log } from "@/lib/utils/logger";

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
    
    const response = NextResponse.json({ brands });
    
    // ⚡ HTTP Cache Headers for CDN and Browser
    // s-maxage: CDN/Vercel Edge cache for 1 hour
    // stale-while-revalidate: Serve stale for 24h while revalidating
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=3600, stale-while-revalidate=86400'
    );
    
    return response;
  } catch (err) {
    log.warn("Failed to list car brands, returning empty array", { error: err });
    return NextResponse.json({ brands: [] }, { status: 200 });
  }
}

// ⚡ Next.js Route Segment Config
// Revalidate this route every 1 hour (ISR)
export const revalidate = 3600;
