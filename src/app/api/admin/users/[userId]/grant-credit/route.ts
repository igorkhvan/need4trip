/**
 * Admin API: Grant Credit
 * 
 * Grant a one-off credit to a user via admin action.
 * WRITE operation - calls adminGrantOneOffCredit service.
 * 
 * @see SSOT_ADMIN_DOMAIN v1.0 §5.1 (One-Off Credit Grant)
 * @see SSOT_BILLING_ADMIN_RULES v1.0 §3 (One-Off Credit Grant Semantics)
 * @see SSOT_ADMIN_UI_PAGE_INVENTORY v1.0 §3.1 (Grant Credit Flow)
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveAdminContext } from "@/lib/auth/resolveAdminContext";
import { adminGrantOneOffCredit } from "@/lib/billing/admin";
import { CREDIT_CODES } from "@/lib/types/billing";
import { log } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

/**
 * POST /api/admin/users/:userId/grant-credit
 * 
 * Body:
 * - creditCode: string (must be valid credit code)
 * - reason: string (mandatory, human-readable justification)
 * 
 * Returns: created credit + audit record id
 */
export async function POST(
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
  // 2. Validate userId
  // =========================================================================
  const { userId } = await context.params;
  
  if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "userId is required",
        },
      },
      { status: 400 }
    );
  }
  
  // =========================================================================
  // 3. Parse and validate body
  // =========================================================================
  let body: { creditCode?: unknown; reason?: unknown };
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
  
  // Validate creditCode
  const { creditCode, reason } = body;
  
  if (!creditCode || typeof creditCode !== "string" || creditCode.trim().length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "creditCode is required and must be a non-empty string",
        },
      },
      { status: 400 }
    );
  }
  
  if (!CREDIT_CODES.includes(creditCode as any)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: `Invalid creditCode. Valid codes: ${CREDIT_CODES.join(", ")}`,
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
    const result = await adminGrantOneOffCredit({
      adminContext,
      userId,
      creditCode: creditCode as any, // Type validated above
      reason: reason.trim(),
    });
    
    log.info("[Admin/GrantCredit] Credit granted", {
      userId,
      creditCode,
      creditId: result.credit.id,
      auditId: result.auditRecord.id,
    });
    
    return NextResponse.json({
      success: true,
      data: {
        credit: {
          id: result.credit.id,
          userId: result.credit.userId,
          creditCode: result.credit.creditCode,
          status: result.credit.status,
          source: result.credit.source,
          createdAt: result.credit.createdAt,
        },
        auditId: result.auditRecord.id,
      },
      message: "Credit granted successfully",
    });
  } catch (err) {
    log.error("[Admin/GrantCredit] Service error", {
      userId,
      creditCode,
      error: err instanceof Error ? err.message : "Unknown error",
    });
    
    // Return specific error message from service
    const message = err instanceof Error ? err.message : "Failed to grant credit";
    
    // Check if it's a validation error from service
    if (message.includes("not found") || message.includes("User not found")) {
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
    
    if (message.includes("Invalid") || message.includes("SSOT")) {
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
