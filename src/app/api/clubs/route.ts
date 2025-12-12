/**
 * API: /api/clubs
 * 
 * GET - Список всех клубов (с поиском)
 * POST - Создать новый клуб
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { listClubs, searchClubs, createClub } from "@/lib/services/clubs";
import { respondError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

/**
 * GET /api/clubs?q=searchQuery
 * Список клубов с опциональным поиском
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q");

    let clubs;
    if (query) {
      clubs = await searchClubs(query);
    } else {
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

