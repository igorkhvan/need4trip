/**
 * Cities API
 * 
 * GET /api/cities - List all cities (or search)
 * GET /api/cities?q=Москва - Search cities by name
 * GET /api/cities?popular=true - Get popular cities only
 * GET /api/cities?ids=id1,id2,id3 - Get cities by IDs
 */

import { NextRequest, NextResponse } from "next/server";
import { searchCities, getPopularCities, getAllCities, getCitiesByIds } from "@/lib/db/cityRepo";

import { log } from "@/lib/utils/logger";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get("q");
  const popularOnly = searchParams.get("popular") === "true";
  const idsParam = searchParams.get("ids");

  try {
    let cities;

    if (idsParam) {
      // Get cities by IDs
      const ids = idsParam.split(",").filter(Boolean);
      if (ids.length === 0) {
        return NextResponse.json({ cities: [] });
      }
      const citiesMap = await getCitiesByIds(ids);
      cities = Array.from(citiesMap.values());
    } else if (query) {
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
    log.errorWithStack("Failed to fetch cities", error, { query, popularOnly, idsParam });
    return NextResponse.json(
      { error: "Failed to fetch cities" },
      { status: 500 }
    );
  }
}
