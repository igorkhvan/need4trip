/**
 * API: /api/clubs/[id]/join-requests
 * 
 * POST - Create a pending join request
 * 
 * Per SSOT_CLUBS_DOMAIN.md §5.3: User-initiated request to join a club.
 * Per SSOT_CLUBS_DOMAIN.md §10.1: Idempotent per (club_id, requester_user_id).
 * Per SSOT_CLUBS_DOMAIN.md §8.3.2: Forbidden when club is archived.
 */

import { NextRequest } from "next/server";
import { getCurrentUserFromMiddleware } from "@/lib/auth/currentUser";
import { createClubJoinRequest } from "@/lib/services/clubs";
import { getClubById } from "@/lib/db/clubRepo";
import { getMember } from "@/lib/db/clubMemberRepo";
import { respondSuccess, respondError } from "@/lib/api/response";
import { log } from "@/lib/utils/logger";
import { 
  NotFoundError, 
  UnauthorizedError, 
  ForbiddenError,
  ConflictError 
} from "@/lib/errors";
import { z } from "zod";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Request body schema
const joinRequestBodySchema = z.object({
  message: z.string().max(500, "Message too long").optional(),
});

/**
 * POST /api/clubs/[id]/join-requests
 * Create a pending join request.
 * 
 * Per SSOT_CLUBS_DOMAIN.md §5.3:
 * - User requests to join a club
 * - Owner approves/rejects
 * - Only owner may approve/reject
 * 
 * Per SSOT_CLUBS_DOMAIN.md §10.1:
 * - Idempotent per (club_id, requester_user_id)
 * - If a pending request exists, return existing request without error
 * 
 * Request Body:
 * - message (optional): string - User's message to the club owner
 * 
 * Responses:
 * - 201: Join request created (or existing pending returned)
 * - 401: Not authenticated
 * - 403: Club is archived / Already a member
 * - 404: Club not found
 * - 409: Already a member (ConflictError)
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { id: clubId } = await params;
    
    // 401: Require authentication
    const user = await getCurrentUserFromMiddleware(req);
    if (!user) {
      throw new UnauthorizedError("Требуется авторизация для отправки запроса на вступление");
    }
    
    // 404: Check club exists
    const club = await getClubById(clubId);
    if (!club) {
      throw new NotFoundError("Клуб не найден");
    }
    
    // 403: Check club is not archived (SSOT_CLUBS_DOMAIN.md §8.3.2)
    if (club.archived_at) {
      throw new ForbiddenError("Нельзя отправить запрос на вступление в архивированный клуб");
    }
    
    // 409: Check user is not already a member
    const existingMember = await getMember(clubId, user.id);
    if (existingMember) {
      // If already member (including pending), return conflict
      if (existingMember.role === "pending") {
        throw new ConflictError("Вы уже отправили запрос на вступление в этот клуб");
      }
      throw new ConflictError("Вы уже являетесь участником этого клуба");
    }
    
    // Parse body (optional message)
    let body: { message?: string } = {};
    try {
      const rawBody = await req.json();
      body = joinRequestBodySchema.parse(rawBody);
    } catch {
      // Empty body is fine - message is optional
      body = {};
    }
    
    // Create join request (idempotent per SSOT_CLUBS_DOMAIN.md §10.1)
    const joinRequest = await createClubJoinRequest(clubId, user.id, body.message);
    
    log.info("Club join request created", { 
      clubId, 
      userId: user.id, 
      requestId: joinRequest.id 
    });
    
    return respondSuccess({ joinRequest }, "Запрос на вступление отправлен", 201);
  } catch (error) {
    const { id } = await params;
    log.errorWithStack("Failed to create join request", error, { clubId: id });
    return respondError(error);
  }
}
