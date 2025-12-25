/**
 * POST /api/billing/credits/confirm
 * 
 * Purpose: Confirm payment and create billing_credit (after Kaspi payment)
 * Spec: One-off event upgrade billing system
 * 
 * This endpoint is called:
 * - By Kaspi webhook (automated)
 * - By admin panel (manual confirmation)
 * 
 * Flow:
 * 1. Mark billing_transaction as 'paid'
 * 2. Create billing_credit (status: available)
 * 3. Idempotent (if credit already exists, return existing)
 */

import { NextRequest } from "next/server";
import { respondSuccess, respondError } from "@/lib/api/respond";
import { getAdminDb } from "@/lib/db/client";
import { createBillingCredit, getCreditByTransactionId } from "@/lib/db/billingCreditsRepo";
import { logger } from "@/lib/utils/logger";

interface ConfirmRequestBody {
  transactionId: string;
  providerPaymentId?: string; // External payment ID from Kaspi
}

export async function POST(req: NextRequest) {
  try {
    // TODO: Add authentication/webhook validation
    // For now, accept requests (MVP)

    // 1. Parse request body
    const body: ConfirmRequestBody = await req.json();
    const { transactionId, providerPaymentId } = body;

    if (!transactionId) {
      return respondError(400, { 
        code: "MISSING_TRANSACTION_ID", 
        message: "transactionId is required" 
      });
    }

    const db = getAdminDb();

    // 2. Get transaction
    const { data: transaction, error: fetchError } = await db
      .from("billing_transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (fetchError || !transaction) {
      return respondError(404, { 
        code: "TRANSACTION_NOT_FOUND", 
        message: "Transaction not found" 
      });
    }

    // 3. Validate transaction is for one-off credit
    if (transaction.product_code !== "EVENT_UPGRADE_500") {
      return respondError(400, { 
        code: "INVALID_PRODUCT_CODE", 
        message: "This endpoint is only for one-off credit confirmation" 
      });
    }

    // 4. Idempotency check (credit already exists?)
    const existingCredit = await getCreditByTransactionId(transactionId);
    if (existingCredit) {
      logger.info("Credit already confirmed (idempotent)", { 
        creditId: existingCredit.id, 
        transactionId 
      });
      return respondSuccess({
        creditId: existingCredit.id,
        transactionId,
        status: "already_confirmed",
      });
    }

    // 5. Update transaction status to 'paid'
    const { error: updateError } = await db
      .from("billing_transactions")
      .update({ 
        status: "paid",
        provider_payment_id: providerPaymentId || transaction.provider_payment_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId);

    if (updateError) {
      logger.error("Failed to update transaction status", { 
        error: updateError, 
        transactionId 
      });
      return respondError(500, { 
        code: "TRANSACTION_UPDATE_FAILED", 
        message: "Failed to update transaction" 
      });
    }

    // 6. Create billing_credit (available)
    const credit = await createBillingCredit({
      userId: transaction.user_id!,  // Non-null asserted (checked by validation)
      creditCode: transaction.product_code as "EVENT_UPGRADE_500",
      sourceTransactionId: transactionId,
    });

    logger.info("Credit confirmed and created", { 
      creditId: credit.id, 
      transactionId,
      userId: transaction.user_id,
    });

    return respondSuccess({
      creditId: credit.id,
      transactionId,
      status: "confirmed",
    });

  } catch (err: any) {
    logger.error("Unexpected error in credit confirmation", { error: err });
    return respondError(500, { 
      code: "INTERNAL_ERROR", 
      message: err.message || "Failed to confirm credit" 
    });
  }
}

