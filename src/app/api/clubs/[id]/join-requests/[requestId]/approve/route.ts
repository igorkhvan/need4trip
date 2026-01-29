/**
 * API: /api/clubs/[id]/join-requests/[requestId]/approve
 * 
 * POST - Approve a pending join request
 * 
 * Phase 8A v1:
 * - TRANSACTIONAL: insert member + delete request
 * - Owner/Admin may approve
 * - Forbidden when club is archived
 * 
 * Emits audit event: JOIN_REQUEST_APPROVED
 */

import { NextRequest } from "next/server";
import { resolveCurrentUser } from "@/lib/auth/resolveCurrentUser";
import { approveClubJoinRequest } from "@/lib/services/clubs";
import { respondSuccess, respondError } from "@/lib/api/response";
import { log } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string; requestId: string }>;
}

/**
 * POST /api/clubs/[id]/join-requests/[requestId]/approve
 * Approve a pending join request.
 * 
 * Phase 8A v1:
 * - TRANSACTIONAL: insert into club_members + delete join request
 * - Owner/Admin may approve
 * 
 * Responses:
 * - 200: Join request approved successfully (member created)
 * - 401: Not authenticated
 * - 403: Not club owner/admin / Club is archived
 * - 404: Club or request not found
 * - 409: Request already processed (not pending)
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { id: clubId, requestId } = await params;
    
    // Auth check is done in service layer
    // Canonical auth resolution (ADR-001)
    const user = await resolveCurrentUser(req);
    
    // Approve join request (owner/admin check inside)
    // Phase 8A v1: transactional (insert member + delete request)
    const result = await approveClubJoinRequest(clubId, requestId, user);
    
    log.info("Club join request approved", { 
      clubId, 
      requestId,
      approvedBy: user?.id,
      requesterUserId: result.requesterUserId
    });
    
    return respondSuccess(
      { 
        success: true, 
        requesterUserId: result.requesterUserId 
      }, 
      "Заявка на вступление одобрена"
    );
  } catch (error) {
    const { id, requestId } = await params;
    log.errorWithStack("Failed to approve join request", error, { clubId: id, requestId });
    return respondError(error);
  }
}
