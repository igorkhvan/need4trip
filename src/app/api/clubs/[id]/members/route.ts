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
  params: Promise<{ id: string }>;
}

/**
 * GET /api/clubs/[id]/members
 * Список участников клуба
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const members = await getClubMembers(id);

    return NextResponse.json({ members });
  } catch (error) {
    const { id } = await params;
    console.error(`[GET /api/clubs/${id}/members]`, error);
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
    const { id } = await params;
    const user = await getCurrentUser();
    const body = await req.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { error: "Missing required fields: userId, role" },
        { status: 400 }
      );
    }

    const member = await addClubMember(id, userId, role as ClubRole, user);

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    const { id } = await params;
    console.error(`[POST /api/clubs/${id}/members]`, error);
    return respondError(error);
  }
}

