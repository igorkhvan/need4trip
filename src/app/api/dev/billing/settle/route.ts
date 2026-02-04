/**
 * POST /api/dev/billing/settle
 * 
 * Purpose: DEV ONLY - Manual transaction settlement for testing
 * Spec: Billing v4 stub mode
 * 
 * In production, this would be replaced by Kaspi webhook
 * 
 * Body:
 * {
 *   "transaction_id": "uuid",
 *   "status": "completed" | "failed" | "refunded"
 * }
 * 
 * Phase P1.1: Refactored to use Settlement Orchestrator
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { respondSuccess, respondError } from "@/lib/api/response";
import { ForbiddenError, ValidationError, NotFoundError, InternalError } from "@/lib/errors";
import { getAdminDb } from "@/lib/db/client";
import { settleTransaction } from "@/lib/payments";
import { logger } from "@/lib/utils/logger";
import type { BillingTransaction, PlanId, TransactionStatus, ProductCode } from "@/lib/types/billing";

// ============================================================================
// Request Schema
// ============================================================================

const settleSchema = z.object({
  transaction_id: z.string().uuid(),
  status: z.enum(["completed", "failed", "refunded"]),
});

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    // DEV MODE CHECK (simple IP check or env var)
    if (process.env.NODE_ENV === "production") {
      throw new ForbiddenError("This endpoint is only available in development");
    }

    // 1. Parse request
    const body = await req.json();
    const parsed = settleSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid request", parsed.error.flatten());
    }

    const { transaction_id, status } = parsed.data;

    // 2. Get transaction (before update to capture original status)
    const db = getAdminDb();
    const { data: dbTransaction, error: fetchError } = await db
      .from("billing_transactions")
      .select("*")
      .eq("id", transaction_id)
      .single();

    if (fetchError || !dbTransaction) {
      throw new NotFoundError("Transaction not found");
    }

    // Capture original status for idempotency check
    const originalStatus = dbTransaction.status;

    // 3. Update transaction status
    const { error: updateError } = await db
      .from("billing_transactions")
      .update({ 
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction_id);

    if (updateError) {
      logger.error("Failed to update transaction status", { transaction_id, status, error: updateError });
      throw new InternalError("Failed to update transaction status");
    }

    // 4. Settlement logic via orchestrator (P1.1)
    if (status === "completed") {
      // Map DB row to domain type for orchestrator
      const transaction: BillingTransaction = {
        id: dbTransaction.id,
        clubId: dbTransaction.club_id,
        planId: dbTransaction.plan_id as PlanId | null,
        userId: dbTransaction.user_id,
        productCode: dbTransaction.product_code as ProductCode,
        provider: dbTransaction.provider,
        providerPaymentId: dbTransaction.provider_payment_id,
        amount: Number(dbTransaction.amount),
        currencyCode: dbTransaction.currency_code,
        status: status as TransactionStatus,
        periodStart: dbTransaction.period_start,
        periodEnd: dbTransaction.period_end,
        createdAt: dbTransaction.created_at,
        updatedAt: dbTransaction.updated_at,
      };

      await settleTransaction(transaction, originalStatus, { caller: 'dev_settle' });
    }

    logger.info("Transaction settled (DEV)", {
      transactionId: transaction_id,
      status,
      productCode: dbTransaction.product_code,
    });

    return respondSuccess({
      transaction_id,
      status,
      message: `Transaction marked as ${status}`,
    });

  } catch (error) {
    logger.error("Settlement failed (DEV)", { error });
    return respondError(error, "Failed to settle transaction");
  }
}

