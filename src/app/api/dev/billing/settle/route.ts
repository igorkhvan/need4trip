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
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { respondSuccess, respondError } from "@/lib/api/response";
import { ForbiddenError, ValidationError, NotFoundError, InternalError } from "@/lib/errors";
import { getAdminDb } from "@/lib/db/client";
import { createBillingCredit } from "@/lib/db/billingCreditsRepo";
import { logger } from "@/lib/utils/logger";

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

    // 2. Get transaction
    const db = getAdminDb();
    const { data: transaction, error: fetchError } = await db
      .from("billing_transactions")
      .select("*")
      .eq("id", transaction_id)
      .single();

    if (fetchError || !transaction) {
      throw new NotFoundError("Transaction not found");
    }

    // 3. Update transaction status
    const { error: updateError } = await db
      .from("billing_transactions")
      .update({ status })
      .eq("id", transaction_id);

    if (updateError) {
      logger.error("Failed to update transaction status", { transaction_id, status, error: updateError });
      throw new InternalError("Failed to update transaction status");
    }

    // 4. Settlement logic (same as webhook would do)
    if (status === "completed") {
      const isOneOff = transaction.product_code === "EVENT_UPGRADE_500";

      if (isOneOff && transaction.user_id) {
        // Create credit (idempotent via source_transaction_id UNIQUE constraint)
        try {
          const credit = await createBillingCredit({
            userId: transaction.user_id,
            creditCode: transaction.product_code as "EVENT_UPGRADE_500", // Fixed: type cast
            sourceTransactionId: transaction_id,
          });

          logger.info("Credit issued after settlement", {
            transactionId: transaction_id,
            creditId: credit.id,
            userId: transaction.user_id,
          });

        } catch (error: any) {
          // If duplicate (idempotency), ignore
          if (error.message?.includes("duplicate") || error.code === "23505") {
            logger.warn("Credit already issued (idempotent)", { transactionId: transaction_id });
          } else {
            throw error;
          }
        }

      } else if (transaction.club_id && transaction.plan_id) {
        // Club subscription settlement (existing logic)
        // TODO: Implement club subscription activation/extension
        logger.info("Club subscription settlement (TODO)", {
          transactionId: transaction_id,
          clubId: transaction.club_id,
          planId: transaction.plan_id,
        });
      }
    }

    logger.info("Transaction settled (DEV)", {
      transactionId: transaction_id,
      status,
      productCode: transaction.product_code,
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

