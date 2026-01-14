/**
 * API: /api/clubs/[id]/join-requests/[requestId]/approve
 * 
 * POST - Approve a pending join request
 * 
 * Per SSOT_CLUBS_DOMAIN.md §5.3: Owner-only.
 * Per SSOT_CLUBS_DOMAIN.md §6.2: Transitions pending → approved.
 * Per SSOT_CLUBS_DOMAIN.md §8.3.2: Forbidden when club is archived.
 * 
 * Emits audit event: JOIN_REQUEST_APPROVED
 */

import { NextRequest } from "next/server";
import { getCurrentUserFromMiddleware } from "@/lib/auth/currentUser";
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
 * Per SSOT_CLUBS_DOMAIN.md §5.3:
 * - Owner approves join request
 * - Creates club_members record with role='member'
 * 
 * Responses:
 * - 200: Join request approved successfully
 * - 401: Not authenticated
 * - 403: Not club owner / Club is archived
 * - 404: Club or request not found
 * - 409: Request already processed (not pending)
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { id: clubId, requestId } = await params;
    
    // Auth check is done in service layer
    const user = await getCurrentUserFromMiddleware(req);
    
    // Approve join request (owner-only check inside)
    const updatedRequest = await approveClubJoinRequest(clubId, requestId, user);
    
    log.info("Club join request approved", { 
      clubId, 
      requestId,
      approvedBy: user?.id,
      requesterUserId: updatedRequest.requesterUserId
    });
    
    return respondSuccess(
      { joinRequest: updatedRequest }, 
      "Заявка на вступление одобрена"
    );
  } catch (error) {
    const { id, requestId } = await params;
    log.errorWithStack("Failed to approve join request", error, { clubId: id, requestId });
    return respondError(error);
  }
}
