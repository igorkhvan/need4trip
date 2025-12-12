/**
 * Cities API
 * 
 * GET /api/cities - List all cities (or search)
 * GET /api/cities?q=Москва - Search cities by name
 * GET /api/cities?popular=true - Get popular cities only
 */

import { NextRequest, NextResponse } from "next/server";
import { searchCities, getPopularCities, getAllCities } from "@/lib/db/cityRepo";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get("q");
  const popularOnly = searchParams.get("popular") === "true";

  try {
    let cities;

    if (query) {
      // Search by name
      cities = await searchCities(query, 20);
    } else if (popularOnly) {
      // Get popular cities only
      cities = await getPopularCities(25);
    } else {
      // Get all cities
      cities = await getAllCities();
    }

    return NextResponse.json({ cities });
  } catch (error) {
    console.error("[GET /api/cities] Failed to fetch cities:", error);
    return NextResponse.json(
      { error: "Failed to fetch cities" },
      { status: 500 }
    );
  }
}
