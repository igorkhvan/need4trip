/**
 * API: /api/clubs/[id]/members
 * 
 * GET - Список участников клуба (requires auth + role check)
 * POST - Добавить участника (owner-only)
 * 
 * Security hardening per SSOT_CLUBS_DOMAIN.md §10.4:
 * Default: Guests cannot access members list or internal content.
 */

import { NextRequest } from "next/server";
import { getCurrentUserFromMiddleware } from "@/lib/auth/currentUser";
import { getClubMembers, addClubMember, requireClubMember } from "@/lib/services/clubs";
import { respondSuccess, respondError } from "@/lib/api/response";
import { log } from "@/lib/utils/logger";
import { ValidationError, UnauthorizedError } from "@/lib/errors";
import type { ClubRole } from "@/lib/types/club";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/clubs/[id]/members
 * Список участников клуба
 * 
 * Per SSOT_CLUBS_DOMAIN.md §10.4: Default members list access requires:
 * - Authentication
 * - Club membership (owner | admin | member; pending is denied)
 * 
 * Per SSOT_ARCHITECTURE.md §20.2: 401 for unauthenticated
 * 
 * Future: public_members_list_enabled flag may allow guest access (§8.4.1)
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    
    // 401: Require authentication (SSOT_ARCHITECTURE.md §20.2)
    const user = await getCurrentUserFromMiddleware(req);
    if (!user) {
      throw new UnauthorizedError("Требуется авторизация для просмотра списка участников");
    }
    
    // Require club membership (owner | admin | member; pending is denied)
    // Per SSOT_CLUBS_DOMAIN.md §3.3: pending has NO privileges
    await requireClubMember(id, user.id, "просмотреть список участников");
    
    const members = await getClubMembers(id);

    return respondSuccess({ members });
  } catch (error) {
    const { id } = await params;
    log.errorWithStack("Failed to get club members", error, { clubId: id });
    return respondError(error);
  }
}

/**
 * POST /api/clubs/[id]/members
 * Добавить участника (owner-only)
 * 
 * Per SSOT_CLUBS_DOMAIN.md §5.1 and §A1: Only owner can invite members.
 * Per SSOT_ARCHITECTURE.md §20.2: 401 for unauthenticated
 * 
 * Body: { userId: string, role: ClubRole }
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    
    // 401: Require authentication (SSOT_ARCHITECTURE.md §20.2)
    const user = await getCurrentUserFromMiddleware(req);
    if (!user) {
      throw new UnauthorizedError("Требуется авторизация для добавления участника");
    }
    
    const body = await req.json();
    const { userId, role } = body;

    if (!userId || !role) {
      throw new ValidationError("Missing required fields: userId, role");
    }

    // Service layer enforces owner-only + blocks 'owner' role assignment
    const member = await addClubMember(id, userId, role as ClubRole, user);

    return respondSuccess({ member }, undefined, 201);
  } catch (error) {
    const { id } = await params;
    log.errorWithStack("Failed to add club member", error, { clubId: id });
    return respondError(error);
  }
}

