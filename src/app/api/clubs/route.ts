/**
 * API: /api/clubs
 * 
 * GET - Список всех клубов (с поиском)
 * POST - Создать новый клуб
 */

import { NextRequest } from "next/server";
import { resolveCurrentUser } from "@/lib/auth/resolveCurrentUser";
import { listClubs, listClubsByCity, searchClubs, createClub } from "@/lib/services/clubs";
import { respondSuccess, respondError } from "@/lib/api/response";
import { UnauthorizedError } from "@/lib/errors";
import { trackWriteAction } from "@/lib/telemetry/abuseTelemetry";

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

    return respondSuccess({
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
    // Canonical auth resolution (ADR-001)
    const user = await resolveCurrentUser(req);
    
    if (!user) {
      throw new UnauthorizedError("Авторизация обязательна для создания клуба");
    }

    const body = await req.json();
    const club = await createClub(body, user);

    // Fire-and-forget: abuse telemetry
    trackWriteAction(user.id, 'clubs.create');

    return respondSuccess({ club }, undefined, 201);
  } catch (error) {
    return respondError(error);
  }
}

