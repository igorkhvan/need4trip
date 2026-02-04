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
 * Settlement logic mirrors DEV settle endpoint behavior.
 */

import { NextRequest, NextResponse } from "next/server";
import { getTransactionByProviderPaymentId } from "@/lib/db/billingTransactionsRepo";
import { getAdminDb } from "@/lib/db/client";
import { createBillingCredit } from "@/lib/db/billingCreditsRepo";
import { activateSubscription } from "@/lib/db/clubSubscriptionRepo";
import { logger } from "@/lib/utils/logger";
import type { PlanId } from "@/lib/types/billing";

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

    // 4. Idempotency: if already completed, return success (NO-OP)
    if (transaction.status === "completed") {
      logger.info("Webhook: transaction already completed (idempotent)", {
        transactionId: transaction.id,
        providerPaymentId,
      });
      return NextResponse.json({ ok: true });
    }

    // 5. Mark transaction as completed
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

    // 6. Issue entitlements (same logic as DEV settle)
    const isOneOff = transaction.productCode === "EVENT_UPGRADE_500";

    if (isOneOff && transaction.userId) {
      // One-off credit: create billing credit
      try {
        const credit = await createBillingCredit({
          userId: transaction.userId,
          creditCode: transaction.productCode as "EVENT_UPGRADE_500",
          sourceTransactionId: transaction.id,
        });

        logger.info("Webhook: credit issued", {
          transactionId: transaction.id,
          creditId: credit.id,
          userId: transaction.userId,
        });

      } catch (error: unknown) {
        // Idempotency: if duplicate, ignore (source_transaction_id UNIQUE constraint)
        const err = error as { message?: string; code?: string };
        if (err.message?.includes("duplicate") || err.code === "23505") {
          logger.warn("Webhook: credit already issued (idempotent)", {
            transactionId: transaction.id,
          });
        } else {
          throw error;
        }
      }

    } else if (transaction.clubId && transaction.planId) {
      // Club subscription: activate with 30-day period (REPLACE semantics)
      const periodStart = new Date().toISOString();
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const subscription = await activateSubscription(
        transaction.clubId,
        transaction.planId as PlanId,
        periodStart,
        periodEnd,
        null // graceUntil = NULL
      );

      logger.info("Webhook: subscription activated", {
        transactionId: transaction.id,
        clubId: transaction.clubId,
        planId: transaction.planId,
        periodStart,
        periodEnd,
        subscriptionStatus: subscription.status,
      });
    }

    logger.info("Webhook: transaction settled", {
      transactionId: transaction.id,
      providerPaymentId,
      productCode: transaction.productCode,
    });

    // 7. Return success
    return NextResponse.json({ ok: true });

  } catch (error) {
    logger.error("Webhook: unexpected error", { error });
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
