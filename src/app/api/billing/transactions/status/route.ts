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
 */

import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { respondSuccess, respondError } from "@/lib/api/respond";
import { getAdminDb } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";

export async function GET(req: NextRequest) {
  try {
    // 1. Authentication required
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return respondError(401, { 
        code: "UNAUTHORIZED", 
        message: "Authentication required" 
      });
    }

    // 2. Get query params
    const { searchParams } = new URL(req.url);
    const transactionId = searchParams.get("transaction_id");
    const transactionReference = searchParams.get("transaction_reference");

    if (!transactionId && !transactionReference) {
      return respondError(400, {
        code: "MISSING_PARAMETER",
        message: "Either transaction_id or transaction_reference is required",
      });
    }

    // 3. Query transaction
    const db = getAdminDb();
    let query = db
      .from("billing_transactions")
      .select("id, status, product_code, amount, currency_code, created_at, updated_at"); // ⚡ Normalized

    if (transactionId) {
      query = query.eq("id", transactionId);
    } else {
      query = query.eq("transaction_reference", transactionReference!);
    }

    const { data: transaction, error } = await query.maybeSingle();

    if (error) {
      logger.error("Failed to fetch transaction status", { transactionId, transactionReference, error });
      return respondError(500, {
        code: "QUERY_FAILED",
        message: "Failed to fetch transaction status",
      });
    }

    if (!transaction) {
      return respondError(404, {
        code: "TRANSACTION_NOT_FOUND",
        message: "Transaction not found",
      });
    }

    // 4. Authorization check (user must own the transaction)
    // For one-off: user_id must match
    // For club: club owner must match (simplified: skip for MVP, rely on transaction_id secrecy)
    // TODO: Add proper authorization check

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
    return respondError(500, {
      code: "INTERNAL_ERROR",
      message: "Failed to query transaction status",
    });
  }
}

