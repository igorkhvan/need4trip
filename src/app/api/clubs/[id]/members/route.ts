/**
 * API: /api/clubs/[id]/members
 * 
 * GET - Список участников клуба
 * POST - Добавить участника
 */

import { NextRequest } from "next/server";
import { getCurrentUserFromMiddleware } from "@/lib/auth/currentUser";
import { getClubMembers, addClubMember } from "@/lib/services/clubs";
import { respondSuccess, respondError } from "@/lib/api/response";
import { log } from "@/lib/utils/logger";
import { ValidationError } from "@/lib/errors";
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
    // GET is public - anyone can see club members
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
 * Добавить участника
 * 
 * Body: { userId: string, role: ClubRole }
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    
    // Get user from middleware (JWT already verified)
    const user = await getCurrentUserFromMiddleware(req);
    
    const body = await req.json();
    const { userId, role } = body;

    if (!userId || !role) {
      throw new ValidationError("Missing required fields: userId, role");
    }

    const member = await addClubMember(id, userId, role as ClubRole, user);

    return respondSuccess({ member }, undefined, 201);
  } catch (error) {
    const { id } = await params;
    log.errorWithStack("Failed to add club member", error, { clubId: id });
    return respondError(error);
  }
}

