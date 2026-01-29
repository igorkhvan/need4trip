/**
 * GET /api/billing/transactions/status
 * 
 * Purpose: Query transaction status (for polling from paywall)
 * Spec: Billing v4
 * 
 * Query params:
 * - transaction_id OR transaction_reference (at least one required)
 * 
 * Returns: { status: "pending" | "completed" | "failed" | "refunded" }
 * 
 * Protected by middleware - requires valid JWT
 */

import { NextRequest } from "next/server";
import { resolveCurrentUser } from "@/lib/auth/resolveCurrentUser";
import { respondSuccess, respondError } from "@/lib/api/response";
import { UnauthorizedError, ValidationError, NotFoundError, InternalError } from "@/lib/errors";
import { getAdminDb } from "@/lib/db/client";
import { getUserClubRole } from "@/lib/db/clubMemberRepo";
import { logger } from "@/lib/utils/logger";

export async function GET(req: NextRequest) {
  try {
    // 1. Authentication required (canonical auth resolution per ADR-001)
    const currentUser = await resolveCurrentUser(req);
    if (!currentUser) {
      throw new UnauthorizedError("Authentication required");
    }

    // 2. Get query params
    const { searchParams } = new URL(req.url);
    const transactionId = searchParams.get("transaction_id");
    const transactionReference = searchParams.get("transaction_reference");

    if (!transactionId && !transactionReference) {
      throw new ValidationError("Either transaction_id or transaction_reference is required");
    }

    // 3. Query transaction
    const db = getAdminDb();
    let query = db
      .from("billing_transactions")
      .select("id, status, product_code, amount, currency_code, created_at, updated_at, user_id, club_id");

    if (transactionId) {
      query = query.eq("id", transactionId);
    } else {
      query = query.eq("transaction_reference", transactionReference!);
    }

    const { data: transaction, error } = await query.maybeSingle();

    if (error) {
      logger.error("Failed to fetch transaction status", { transactionId, transactionReference, error });
      throw new InternalError("Failed to fetch transaction status");
    }

    if (!transaction) {
      throw new NotFoundError("Transaction not found");
    }

    // 4. Authorization check (user must own the transaction)
    // Security: Return 404 on ownership mismatch to avoid existence leakage
    // Per BILLING_AUDIT_REPORT.md GAP-1 and SSOT_ARCHITECTURE.md §8.4
    
    // For one-off credits: user_id must match
    if (transaction.user_id && transaction.user_id !== currentUser.id) {
      logger.warn("Transaction ownership mismatch (user_id)", {
        transactionId: transaction.id,
        requestingUserId: currentUser.id,
      });
      throw new NotFoundError("Transaction not found");
    }
    
    // For club subscriptions: only club owner can view
    if (transaction.club_id) {
      const role = await getUserClubRole(transaction.club_id, currentUser.id);
      if (role !== "owner") {
        logger.warn("Transaction ownership mismatch (club_id)", {
          transactionId: transaction.id,
          clubId: transaction.club_id,
          requestingUserId: currentUser.id,
          userRole: role,
        });
        throw new NotFoundError("Transaction not found");
      }
    }

    logger.info("Transaction status queried", {
      transactionId: transaction.id,
      status: transaction.status,
      userId: currentUser.id,
    });

    // 5. Return status
    return respondSuccess({
      transaction_id: transaction.id,
      status: transaction.status,
      product_code: transaction.product_code,
      amount: Number(transaction.amount),           // ⚡ Normalized
      currency_code: transaction.currency_code,     // ⚡ Normalized
      created_at: transaction.created_at,
      updated_at: transaction.updated_at,
    });

  } catch (error) {
    logger.error("Transaction status query failed", { error });
    return respondError(error, "Failed to query transaction status");
  }
}

