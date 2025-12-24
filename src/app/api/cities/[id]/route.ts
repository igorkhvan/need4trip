/**
 * City by ID API
 * 
 * GET /api/cities/[id] - Get city by ID
 * Public endpoint (no auth required)
 * 
 * ⚡ PERFORMANCE: Cached for 24 hours (cities rarely change)
 * - CDN/Browser cache: 24 hours
 * - Stale-while-revalidate: 7 days
 */

import { NextRequest, NextResponse } from "next/server";
import { getCityById } from "@/lib/db/cityRepo";
import { log } from "@/lib/utils/logger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "City ID is required" },
      { status: 400 }
    );
  }

  try {
    const city = await getCityById(id);

    if (!city) {
      return NextResponse.json(
        { error: "City not found" },
        { status: 404 }
      );
    }

    const response = NextResponse.json({ city });
    
    // ⚡ HTTP Cache Headers for CDN and Browser
    // Cities rarely change, cache aggressively
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=86400, stale-while-revalidate=604800'
    );
    
    return response;
  } catch (error) {
    log.errorWithStack("Failed to fetch city by ID", error, { cityId: id });
    return NextResponse.json(
      { error: "Failed to fetch city" },
      { status: 500 }
    );
  }
}

// ⚡ Next.js Route Segment Config
// Revalidate this route every 24 hours (ISR)
export const revalidate = 86400;
