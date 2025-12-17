import { NextResponse } from "next/server";

import { listCarBrands } from "@/lib/db/carBrandRepo";
import { log } from "@/lib/utils/logger";

/**
 * GET /api/car-brands
 * 
 * List all car brands
 * Public endpoint (no auth required)
 */
export async function GET() {
  try {
    const brands = await listCarBrands();
    return NextResponse.json({ brands });
  } catch (err) {
    log.warn("Failed to list car brands, returning empty array", { error: err });
    return NextResponse.json({ brands: [] }, { status: 200 });
  }
}
