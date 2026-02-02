/**
 * Admin API: Club Detail
 * 
 * Get detailed club subscription view including:
 * - Identity
 * - Plan identifier
 * - Subscription state
 * - Expiration dates
 * - Plan limits (read-only)
 * 
 * READ-ONLY - no mutations.
 * 
 * @see SSOT_ADMIN_DOMAIN v1.0 §4.2 (Club Context Read-Only)
 * @see SSOT_ADMIN_UI_PAGE_INVENTORY v1.0 §2.5 (Club Detail — Subscription)
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveAdminContext } from "@/lib/auth/resolveAdminContext";
import { getClubById } from "@/lib/db/clubRepo";
import { getClubSubscription } from "@/lib/db/clubSubscriptionRepo";
import { getAdminAuditByTarget } from "@/lib/db/adminAuditLogRepo";
import { getAdminDb } from "@/lib/db/client";
import { log } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ clubId: string }>;
};

/**
 * GET /api/admin/clubs/:clubId
 * 
 * Returns: club subscription view with identity, plan, state, limits
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  // =========================================================================
  // 1. Resolve Admin Context (MANDATORY)
  // =========================================================================
  const adminContext = resolveAdminContext(request);
  
  if (!adminContext) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Invalid admin credentials",
        },
      },
      { status: 403 }
    );
  }
  
  // =========================================================================
  // 2. Validate clubId
  // =========================================================================
  const { clubId } = await context.params;
  
  if (!clubId || typeof clubId !== "string" || clubId.trim().length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "clubId is required",
        },
      },
      { status: 400 }
    );
  }
  
  // =========================================================================
  // 3. Fetch club
  // =========================================================================
  try {
    const club = await getClubById(clubId);
    
    if (!club) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Club not found",
          },
        },
        { status: 404 }
      );
    }
    
    // =========================================================================
    // 4. Fetch subscription
    // =========================================================================
    const subscription = await getClubSubscription(clubId);
    
    // =========================================================================
    // 5. Fetch plan limits if subscription exists
    // =========================================================================
    let planLimits = null;
    if (subscription) {
      const db = getAdminDb();
      const { data: plan } = await db
        .from("club_plans")
        .select("id, title, max_members, max_event_participants, allow_paid_events, allow_csv_export")
        .eq("id", subscription.planId)
        .single();
      
      if (plan) {
        planLimits = {
          planId: plan.id,
          title: plan.title,
          maxMembers: plan.max_members,
          maxEventParticipants: plan.max_event_participants,
          allowPaidEvents: plan.allow_paid_events,
          allowCsvExport: plan.allow_csv_export,
        };
      }
    }
    
    // =========================================================================
    // 6. Fetch related audit records
    // =========================================================================
    let auditRecords: any[] = [];
    try {
      const records = await getAdminAuditByTarget("club", clubId, 50);
      auditRecords = records.map(r => ({
        id: r.id,
        actionType: r.actionType,
        actorId: r.actorId,
        reason: r.reason,
        result: r.result,
        metadata: r.metadata,
        createdAt: r.createdAt,
      }));
    } catch (auditErr) {
      log.warn("[Admin/ClubDetail] Failed to fetch audit records", { clubId, error: auditErr });
    }
    
    // =========================================================================
    // 7. Return response
    // =========================================================================
    return NextResponse.json({
      success: true,
      data: {
        club: {
          id: club.id,
          name: club.name,
          ownerUserId: club.owner_user_id,
          isArchived: club.archived_at !== null,
          createdAt: club.created_at,
        },
        subscription: subscription ? {
          planId: subscription.planId,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          graceUntil: subscription.graceUntil,
          createdAt: subscription.createdAt,
          updatedAt: subscription.updatedAt,
        } : null,
        planLimits,
        auditRecords,
      },
    });
  } catch (err) {
    log.error("[Admin/ClubDetail] Unexpected error", { clubId, error: err });
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      },
      { status: 500 }
    );
  }
}
