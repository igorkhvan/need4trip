/**
 * API: /api/clubs/[id]/join-requests/[requestId]/reject
 * 
 * POST - Reject a pending join request
 * 
 * Phase 8A v1:
 * - SILENT: delete request without storing rejection
 * - Owner/Admin may reject
 * - User can retry after rejection
 * - Forbidden when club is archived
 * 
 * Emits audit event: JOIN_REQUEST_REJECTED
 */

import { NextRequest } from "next/server";
import { getCurrentUserFromMiddleware } from "@/lib/auth/currentUser";
import { rejectClubJoinRequest } from "@/lib/services/clubs";
import { respondSuccess, respondError } from "@/lib/api/response";
import { log } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string; requestId: string }>;
}

/**
 * POST /api/clubs/[id]/join-requests/[requestId]/reject
 * Reject a pending join request.
 * 
 * Phase 8A v1:
 * - SILENT: delete request (no rejection reason stored)
 * - Owner/Admin may reject
 * - User can retry after rejection (creates new request)
 * 
 * Responses:
 * - 200: Join request rejected successfully (deleted)
 * - 401: Not authenticated
 * - 403: Not club owner/admin / Club is archived
 * - 404: Club or request not found
 * - 409: Request already processed (not pending)
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { id: clubId, requestId } = await params;
    
    // Auth check is done in service layer
    const user = await getCurrentUserFromMiddleware(req);
    
    // Reject join request (owner/admin check inside)
    // Phase 8A v1: silent DELETE
    const result = await rejectClubJoinRequest(clubId, requestId, user);
    
    log.info("Club join request rejected", { 
      clubId, 
      requestId,
      rejectedBy: user?.id,
      requesterUserId: result.requesterUserId
    });
    
    return respondSuccess(
      { 
        success: true, 
        requesterUserId: result.requesterUserId 
      }, 
      "Заявка на вступление отклонена"
    );
  } catch (error) {
    const { id, requestId } = await params;
    log.errorWithStack("Failed to reject join request", error, { clubId: id, requestId });
    return respondError(error);
  }
}
