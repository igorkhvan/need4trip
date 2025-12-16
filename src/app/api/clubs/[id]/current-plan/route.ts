/**
 * API: GET /api/clubs/[id]/current-plan
 * 
 * Returns current plan and limits for a specific club
 * Used by frontend to show dynamic limits in forms
 * 
 * Source: BILLING_FRONTEND_ANALYSIS.md
 */

import { NextRequest } from "next/server";
import { respondError, respondSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getClubCurrentPlan } from "@/lib/services/accessControl";
import { getClub } from "@/lib/services/clubs";
import { AuthError, NotFoundError } from "@/lib/errors";
import { getPlanById } from "@/lib/db/planRepo";

type Params = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

/**
 * GET /api/clubs/[id]/current-plan
 * 
 * Returns:
 * - planId: "free" | "club_50" | "club_500" | "club_unlimited"
 * - planTitle: Human-readable plan name
 * - subscription: Current subscription status (if exists)
 * - limits: What this plan allows
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id: clubId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      throw new AuthError("Необходима авторизация");
    }

    // Check if club exists
    const club = await getClub(clubId);
    if (!club) {
      throw new NotFoundError("Клуб не найден");
    }

    // Get current plan from billing system
    // Now returns plan object for both FREE and paid plans (from DB)
    const { planId, plan, subscription } = await getClubCurrentPlan(clubId);

    // Format response (unified for all plans)
    return respondSuccess({
      planId: plan.id,
      planTitle: plan.title,
      subscription: subscription ? {
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        graceUntil: subscription.graceUntil,
      } : null,
      limits: {
        maxMembers: plan.maxMembers,
        maxEventParticipants: plan.maxEventParticipants,
        allowPaidEvents: plan.allowPaidEvents,
        allowCsvExport: plan.allowCsvExport,
      },
    });
  } catch (error) {
    return respondError(error);
  }
}
