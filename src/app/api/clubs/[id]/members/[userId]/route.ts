/**
 * API: /api/clubs/[id]/members/[userId]
 * 
 * PATCH - Изменить роль участника
 * DELETE - Удалить участника
 */

import { NextRequest } from "next/server";
import { getCurrentUserFromMiddleware } from "@/lib/auth/currentUser";
import { updateClubMemberRole, removeClubMember } from "@/lib/services/clubs";
import { respondSuccess, respondError } from "@/lib/api/response";
import { log } from "@/lib/utils/logger";
import { ValidationError } from "@/lib/errors";
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
    
    // Get user from middleware (JWT already verified)
    const user = await getCurrentUserFromMiddleware(req);
    
    const body = await req.json();
    const { role } = body;

    if (!role) {
      throw new ValidationError("Missing required field: role");
    }

    const member = await updateClubMemberRole(id, userId, role as ClubRole, user);

    return respondSuccess({ member });
  } catch (error) {
    const { id, userId } = await params;
    log.errorWithStack("Failed to update club member role", error, { clubId: id, memberId: userId });
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
    
    // Get user from middleware (JWT already verified)
    const user = await getCurrentUserFromMiddleware(req);
    
    await removeClubMember(id, userId, user);

    return respondSuccess({ success: true });
  } catch (error) {
    const { id, userId } = await params;
    log.errorWithStack("Failed to remove club member", error, { clubId: id, memberId: userId });
    return respondError(error);
  }
}

