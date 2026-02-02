/**
 * Admin API: User Detail
 * 
 * Get detailed user billing view including:
 * - Identity
 * - One-off credits (with source)
 * - Billing transactions (read-only)
 * 
 * READ-ONLY - no mutations.
 * 
 * @see SSOT_ADMIN_DOMAIN v1.0 §4.1 (User Context Read-Only)
 * @see SSOT_ADMIN_UI_PAGE_INVENTORY v1.0 §2.3 (User Detail — Billing)
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveAdminContext } from "@/lib/auth/resolveAdminContext";
import { getUserById } from "@/lib/db/userRepo";
import { getAdminDb } from "@/lib/db/client";
import { log } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

/**
 * GET /api/admin/users/:userId
 * 
 * Returns: user billing view with identity, credits, transactions
 */
export async function GET(
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
  // 3. Fetch user
  // =========================================================================
  try {
    const user = await getUserById(userId);
    
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "User not found",
          },
        },
        { status: 404 }
      );
    }
    
    // =========================================================================
    // 4. Fetch user's billing credits
    // =========================================================================
    const db = getAdminDb();
    
    const { data: credits, error: creditsError } = await db
      .from("billing_credits")
      .select("id, credit_code, status, source, consumed_event_id, consumed_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    
    if (creditsError) {
      log.error("[Admin/UserDetail] Failed to fetch credits", { userId, error: creditsError });
    }
    
    // =========================================================================
    // 5. Fetch user's billing transactions
    // =========================================================================
    const { data: transactions, error: transactionsError } = await db
      .from("billing_transactions")
      .select("id, product_code, provider, amount, currency_code, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    
    if (transactionsError) {
      log.error("[Admin/UserDetail] Failed to fetch transactions", { userId, error: transactionsError });
    }
    
    // =========================================================================
    // 6. Map to response format
    // =========================================================================
    const mappedCredits = (credits ?? []).map((c: any) => ({
      id: c.id,
      creditCode: c.credit_code,
      status: c.status,
      source: c.source,
      consumedEventId: c.consumed_event_id,
      consumedAt: c.consumed_at,
      createdAt: c.created_at,
    }));
    
    const mappedTransactions = (transactions ?? []).map((t: any) => ({
      id: t.id,
      productCode: t.product_code,
      provider: t.provider,
      amount: t.amount,
      currencyCode: t.currency_code,
      status: t.status,
      createdAt: t.created_at,
    }));
    
    // Count available credits
    const availableCreditsCount = mappedCredits.filter(
      (c: any) => c.status === "available"
    ).length;
    
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          telegramHandle: user.telegramHandle,
          createdAt: user.createdAt,
        },
        billing: {
          availableCreditsCount,
          credits: mappedCredits,
          transactions: mappedTransactions,
        },
      },
    });
  } catch (err) {
    log.error("[Admin/UserDetail] Unexpected error", { userId, error: err });
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
