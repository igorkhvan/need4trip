/**
 * API: /api/clubs/[id]/members/[userId]
 * 
 * PATCH - Изменить роль участника (owner-only, NO owner assignment)
 * DELETE - Удалить участника (owner-only for removal, self-leave allowed)
 * 
 * Security hardening per SSOT_CLUBS_DOMAIN.md:
 * - §7.3: Role changes are owner-only
 * - §7.4: Owner role cannot be assigned via role change (use ownership transfer)
 * - §7.1-7.2: Only owner can remove others; self-leave is allowed
 */

import { NextRequest } from "next/server";
import { getCurrentUserFromMiddleware } from "@/lib/auth/currentUser";
import { updateClubMemberRole, removeClubMember } from "@/lib/services/clubs";
import { respondSuccess, respondError } from "@/lib/api/response";
import { log } from "@/lib/utils/logger";
import { ValidationError, UnauthorizedError } from "@/lib/errors";
import type { ClubRole } from "@/lib/types/club";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string; userId: string }>;
}

/**
 * PATCH /api/clubs/[id]/members/[userId]
 * Изменить роль участника (owner-only)
 * 
 * Per SSOT_CLUBS_DOMAIN.md §7.3-7.4:
 * - Only owner can change roles
 * - Assigning 'owner' via role change is FORBIDDEN
 * - Allowed transitions: member ↔ admin
 * 
 * Per SSOT_ARCHITECTURE.md §20.2: 401 for unauthenticated
 * 
 * Body: { role: ClubRole }
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { id, userId } = await params;
    
    // 401: Require authentication (SSOT_ARCHITECTURE.md §20.2)
    const user = await getCurrentUserFromMiddleware(req);
    if (!user) {
      throw new UnauthorizedError("Требуется авторизация для изменения роли");
    }
    
    const body = await req.json();
    const { role } = body;

    if (!role) {
      throw new ValidationError("Missing required field: role");
    }

    // Service layer enforces: owner-only + blocks 'owner' role assignment
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
 * 
 * Per SSOT_CLUBS_DOMAIN.md §7.1-7.2:
 * - Members can leave on their own (self-removal)
 * - Owner cannot leave without transferring ownership first
 * - Only owner can remove other members
 * 
 * Per SSOT_ARCHITECTURE.md §20.2: 401 for unauthenticated
 */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { id, userId } = await params;
    
    // 401: Require authentication (SSOT_ARCHITECTURE.md §20.2)
    const user = await getCurrentUserFromMiddleware(req);
    if (!user) {
      throw new UnauthorizedError("Требуется авторизация для удаления участника");
    }
    
    // Service layer enforces: self-leave OR owner-only for removal
    await removeClubMember(id, userId, user);

    return respondSuccess({ success: true });
  } catch (error) {
    const { id, userId } = await params;
    log.errorWithStack("Failed to remove club member", error, { clubId: id, memberId: userId });
    return respondError(error);
  }
}

