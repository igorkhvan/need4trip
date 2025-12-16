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
import { UnauthorizedError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/clubs?q=searchQuery&cityId=cityId&page=1&limit=12
 * Список клубов с опциональным поиском, фильтром по городу и пагинацией
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q");
    const cityId = searchParams.get("cityId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);

    let result;
    if (cityId) {
      // Filter by city
      result = await listClubsByCity(cityId, page, limit);
    } else if (query) {
      // Search by name
      result = await searchClubs(query, page, limit);
    } else {
      // List all
      result = await listClubs(page, limit);
    }

    return NextResponse.json({
      clubs: result.clubs,
      total: result.total,
      hasMore: result.hasMore,
      page,
      limit,
    });
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
    
    if (!user) {
      throw new UnauthorizedError("Авторизация обязательна для создания клуба");
    }

    const body = await req.json();
    const club = await createClub(body, user);

    return NextResponse.json({ club }, { status: 201 });
  } catch (error) {
    return respondError(error);
  }
}

