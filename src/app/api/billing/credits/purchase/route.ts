/**
 * POST /api/billing/credits/purchase
 * 
 * Purpose: Purchase a one-off event upgrade credit
 * Spec: One-off event upgrade billing system
 * 
 * Flow:
 * 1. Create billing_transaction (pending)
 * 2. Generate Kaspi payment link
 * 3. Return payment link to frontend
 * 4. After payment confirmation → create billing_credit (available)
 * 
 * Note: Payment confirmation is handled separately via webhook/manual confirmation
 */

import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { respondSuccess, respondError } from "@/lib/api/respond";
import { getAdminDb } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";
import type { CreditCode } from "@/lib/types/billing";

interface PurchaseRequestBody {
  creditCode: CreditCode;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication required
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return respondError(401, { code: "UNAUTHORIZED", message: "Authentication required" });
    }

    // 2. Parse request body
    const body: PurchaseRequestBody = await req.json();
    const { creditCode } = body;

    if (creditCode !== "EVENT_UPGRADE_500") {
      return respondError(400, { 
        code: "INVALID_CREDIT_CODE", 
        message: "Invalid credit code" 
      });
    }

    // 3. Get product details (TODO: Move to config/DB)
    const PRODUCT_PRICES: Record<CreditCode, number> = {
      EVENT_UPGRADE_500: 1000, // 1000 KZT
    };

    const priceKzt = PRODUCT_PRICES[creditCode];

    // 4. Create billing transaction (pending)
    const db = getAdminDb();
    const { data: transaction, error: txError } = await db
      .from("billing_transactions")
      .insert({
        user_id: currentUser.id, // Track who purchased the credit
        club_id: null, // One-off credits are not tied to clubs
        plan_id: null,
        product_code: creditCode,
        provider: "kaspi",
        provider_payment_id: null, // Will be set after payment
        amount_kzt: priceKzt,
        currency: "KZT",
        status: "pending",
        period_start: null,
        period_end: null,
      })
      .select("*")
      .single();

    if (txError) {
      logger.error("Failed to create billing transaction", { error: txError, creditCode, userId: currentUser.id });
      return respondError(500, { 
        code: "TRANSACTION_CREATE_FAILED", 
        message: "Failed to create transaction" 
      });
    }

    logger.info("Billing transaction created (pending)", { 
      transactionId: transaction.id, 
      creditCode, 
      userId: currentUser.id 
    });

    // 5. Generate Kaspi payment link (TODO: Integrate with Kaspi API)
    const paymentLink = await generateKaspiPaymentLink({
      transactionId: transaction.id,
      amountKzt: priceKzt,
      description: `Event Upgrade 500 Credit`,
      userId: currentUser.id,
    });

    // 6. Return payment link
    return respondSuccess({
      transactionId: transaction.id,
      creditCode,
      priceKzt,
      currency: "KZT",
      provider: "kaspi",
      paymentLink,
      status: "pending",
    });

  } catch (err: any) {
    logger.error("Unexpected error in credit purchase", { error: err });
    return respondError(500, { 
      code: "INTERNAL_ERROR", 
      message: err.message || "Failed to purchase credit" 
    });
  }
}

// ============================================================================
// Kaspi Payment Integration (Stub)
// ============================================================================

async function generateKaspiPaymentLink(params: {
  transactionId: string;
  amountKzt: number;
  description: string;
  userId: string;
}): Promise<string> {
  // TODO: Integrate with Kaspi Payment Gateway API
  // This is a stub implementation
  
  logger.warn("Using stub Kaspi payment link generator", params);

  // In production, this should:
  // 1. Call Kaspi API to create invoice
  // 2. Store provider_payment_id in transaction
  // 3. Return actual payment link

  // For MVP, return a placeholder link
  return `https://kaspi.kz/payments/invoice?id=${params.transactionId}&amount=${params.amountKzt}`;
}

