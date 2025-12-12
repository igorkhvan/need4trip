/**
 * API: /api/clubs/[id]/members/[userId]
 * 
 * PATCH - Изменить роль участника
 * DELETE - Удалить участника
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { updateClubMemberRole, removeClubMember } from "@/lib/services/clubs";
import { respondError } from "@/lib/api/response";
import type { ClubRole } from "@/lib/types/club";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string; userId: string }>;
}

/**
 * PATCH /api/clubs/[id]/members/[userId]
 * Изменить роль участника
 * 
 * Body: { role: ClubRole }
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { id, userId } = await params;
    const user = await getCurrentUser();
    const body = await req.json();
    const { role } = body;

    if (!role) {
      return NextResponse.json(
        { error: "Missing required field: role" },
        { status: 400 }
      );
    }

    const member = await updateClubMemberRole(id, userId, role as ClubRole, user);

    return NextResponse.json({ member });
  } catch (error) {
    const { id, userId } = await params;
    console.error(`[PATCH /api/clubs/${id}/members/${userId}]`, error);
    return respondError(error);
  }
}

/**
 * DELETE /api/clubs/[id]/members/[userId]
 * Удалить участника
 */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { id, userId } = await params;
    const user = await getCurrentUser();
    await removeClubMember(id, userId, user);

    return NextResponse.json({ success: true });
  } catch (error) {
    const { id, userId } = await params;
    console.error(`[DELETE /api/clubs/${id}/members/${userId}]`, error);
    return respondError(error);
  }
}

