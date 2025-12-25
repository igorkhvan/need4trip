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

import { NextRequest } from "next/server";
import { getCityById } from "@/lib/db/cityRepo";
import { log } from "@/lib/utils/logger";
import { respondSuccess, respondError } from "@/lib/api/response";
import { NotFoundError, ValidationError } from "@/lib/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    throw new ValidationError("City ID is required");
  }

  try {
    const city = await getCityById(id);

    if (!city) {
      throw new NotFoundError("City not found");
    }

    return respondSuccess({ city }, undefined, 200, {
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800'
    });
  } catch (error) {
    log.errorWithStack("Failed to fetch city by ID", error, { cityId: id });
    return respondError(error);
  }
}

// ⚡ Next.js Route Segment Config
// Revalidate this route every 24 hours (ISR)
export const revalidate = 86400;
