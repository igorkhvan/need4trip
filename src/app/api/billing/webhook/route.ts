/**
 * POST /api/billing/webhook
 * 
 * PHASE_P0_2: Production webhook entrypoint skeleton
 * 
 * Purpose: Generic webhook handler for payment completion.
 * NOT Kaspi-specific - no signature validation, no provider-specific mapping.
 * 
 * Behavior:
 * 1. Parse JSON body, extract provider_payment_id
 * 2. Lookup transaction by provider_payment_id
 * 3. If already completed → 200 OK (idempotent NO-OP)
 * 4. Otherwise → mark completed, issue entitlements, return 200 OK
 * 
 * Phase P1.1: Refactored to use Settlement Orchestrator
 */

import { NextRequest, NextResponse } from "next/server";
import { getTransactionByProviderPaymentId } from "@/lib/db/billingTransactionsRepo";
import { getAdminDb } from "@/lib/db/client";
import { settleTransaction } from "@/lib/payments";
import { logger } from "@/lib/utils/logger";

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    // 1. Parse JSON body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid request body" },
        { status: 400 }
      );
    }

    // 2. Extract required identifier
    if (
      typeof body !== "object" ||
      body === null ||
      !("provider_payment_id" in body) ||
      typeof (body as Record<string, unknown>).provider_payment_id !== "string" ||
      (body as Record<string, unknown>).provider_payment_id === ""
    ) {
      return NextResponse.json(
        { ok: false, error: "Missing required field" },
        { status: 400 }
      );
    }

    const providerPaymentId = (body as { provider_payment_id: string }).provider_payment_id;

    // 3. Lookup transaction by provider_payment_id
    const transaction = await getTransactionByProviderPaymentId(providerPaymentId);

    if (!transaction) {
      logger.warn("Webhook: transaction not found", { providerPaymentId });
      return NextResponse.json(
        { ok: false, error: "Transaction not found" },
        { status: 404 }
      );
    }

    // 4. Capture original status for idempotency check
    const originalStatus = transaction.status;

    // 5. Idempotency: if already completed, return success (NO-OP)
    if (transaction.status === "completed") {
      logger.info("Webhook: transaction already completed (idempotent)", {
        transactionId: transaction.id,
        providerPaymentId,
      });
      return NextResponse.json({ ok: true });
    }

    // 6. Mark transaction as completed
    const db = getAdminDb();
    const { error: updateError } = await db
      .from("billing_transactions")
      .update({ 
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.id);

    if (updateError) {
      logger.error("Webhook: failed to update transaction status", {
        transactionId: transaction.id,
        error: updateError,
      });
      return NextResponse.json(
        { ok: false, error: "Failed to process" },
        { status: 500 }
      );
    }

    // 7. Issue entitlements via Settlement Orchestrator (P1.1)
    // Update transaction status in domain object before passing to orchestrator
    const updatedTransaction = { ...transaction, status: 'completed' as const };
    
    await settleTransaction(updatedTransaction, originalStatus, { caller: 'webhook' });

    logger.info("Webhook: transaction settled", {
      transactionId: transaction.id,
      providerPaymentId,
      productCode: transaction.productCode,
    });

    // 8. Return success
    return NextResponse.json({ ok: true });

  } catch (error) {
    logger.error("Webhook: unexpected error", { error });
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
