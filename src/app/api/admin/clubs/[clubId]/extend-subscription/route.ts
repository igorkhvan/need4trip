/**
 * Admin API: Extend Subscription
 * 
 * Extend a club subscription's expiration date via admin action.
 * WRITE operation - calls adminExtendSubscriptionExpiration service.
 * 
 * @see SSOT_ADMIN_DOMAIN v1.0 §5.2 (Subscription Extension)
 * @see SSOT_BILLING_ADMIN_RULES v1.0 §4 (Subscription Extension Semantics)
 * @see SSOT_ADMIN_UI_PAGE_INVENTORY v1.0 §3.2 (Extend Subscription Flow)
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveAdminContext } from "@/lib/auth/resolveAdminContext";
import { adminExtendSubscriptionExpiration } from "@/lib/billing/admin";
import { log } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ clubId: string }>;
};

/**
 * POST /api/admin/clubs/:clubId/extend-subscription
 * 
 * Body:
 * - days: number (positive integer, days to extend)
 * - reason: string (mandatory, human-readable justification)
 * 
 * Returns: updated subscription + audit record id
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  // =========================================================================
  // 1. Resolve Admin Context (MANDATORY)
  // =========================================================================
  const adminContext = await resolveAdminContext(request);
  
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
  // 3. Parse and validate body
  // =========================================================================
  let body: { days?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid JSON body",
        },
      },
      { status: 400 }
    );
  }
  
  const { days, reason } = body;
  
  // Validate days
  if (days === undefined || days === null) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "days is required",
        },
      },
      { status: 400 }
    );
  }
  
  if (typeof days !== "number" || !Number.isInteger(days) || days <= 0) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "days must be a positive integer",
        },
      },
      { status: 400 }
    );
  }
  
  // Validate reason
  if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "reason is required and must be a non-empty string",
        },
      },
      { status: 400 }
    );
  }
  
  // =========================================================================
  // 4. Call admin service
  // =========================================================================
  try {
    const result = await adminExtendSubscriptionExpiration({
      adminContext,
      clubId,
      days,
      reason: reason.trim(),
    });
    
    log.info("[Admin/ExtendSubscription] Subscription extended", {
      clubId,
      days,
      previousExpiresAt: result.previousExpiresAt,
      newExpiresAt: result.newExpiresAt,
      auditId: result.auditRecord.id,
    });
    
    return NextResponse.json({
      success: true,
      data: {
        subscription: {
          clubId: result.subscription.clubId,
          planId: result.subscription.planId,
          status: result.subscription.status,
          currentPeriodStart: result.subscription.currentPeriodStart,
          currentPeriodEnd: result.subscription.currentPeriodEnd,
          graceUntil: result.subscription.graceUntil,
        },
        previousExpiresAt: result.previousExpiresAt,
        newExpiresAt: result.newExpiresAt,
        auditId: result.auditRecord.id,
      },
      message: "Subscription extended successfully",
    });
  } catch (err) {
    log.error("[Admin/ExtendSubscription] Service error", {
      clubId,
      days,
      error: err instanceof Error ? err.message : "Unknown error",
    });
    
    // Return specific error message from service
    const message = err instanceof Error ? err.message : "Failed to extend subscription";
    
    // Check if it's a validation error from service
    if (message.includes("not found") || message.includes("Club not found") || message.includes("No subscription found")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message,
          },
        },
        { status: 404 }
      );
    }
    
    if (message.includes("Invalid") || message.includes("SSOT") || message.includes("not eligible")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message,
          },
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message,
        },
      },
      { status: 500 }
    );
  }
}
