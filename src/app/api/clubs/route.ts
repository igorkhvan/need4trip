/**
 * API: /api/clubs
 * 
 * GET - Список всех клубов (с поиском)
 * POST - Создать новый клуб
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { listClubs, listClubsByCity, searchClubs, createClub } from "@/lib/services/clubs";
import { respondError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

/**
 * GET /api/clubs?q=searchQuery&cityId=cityId
 * Список клубов с опциональным поиском и фильтром по городу
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q");
    const cityId = searchParams.get("cityId");

    let clubs;
    if (cityId) {
      // Filter by city
      clubs = await listClubsByCity(cityId);
    } else if (query) {
      // Search by name
      clubs = await searchClubs(query);
    } else {
      // List all
      clubs = await listClubs();
    }

    return NextResponse.json({ clubs });
  } catch (error) {
    return respondError(error);
  }
}

/**
 * POST /api/clubs
 * Создать новый клуб
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const club = await createClub(body, user);

    return NextResponse.json({ club }, { status: 201 });
  } catch (error) {
    return respondError(error);
  }
}

