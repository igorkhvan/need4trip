/**
 * API: /api/clubs/[id]/members
 * 
 * GET - Список участников клуба
 * POST - Добавить участника
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getClubMembers, addClubMember } from "@/lib/services/clubs";
import { respondError } from "@/lib/api/response";
import type { ClubRole } from "@/lib/types/club";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: { id: string };
}

/**
 * GET /api/clubs/[id]/members
 * Список участников клуба
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const members = await getClubMembers(params.id);

    return NextResponse.json({ members });
  } catch (error) {
    console.error(`[GET /api/clubs/${params.id}/members]`, error);
    return respondError(error);
  }
}

/**
 * POST /api/clubs/[id]/members
 * Добавить участника
 * 
 * Body: { userId: string, role: ClubRole }
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { error: "Missing required fields: userId, role" },
        { status: 400 }
      );
    }

    const member = await addClubMember(params.id, userId, role as ClubRole, user);

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    console.error(`[POST /api/clubs/${params.id}/members]`, error);
    return respondError(error);
  }
}

