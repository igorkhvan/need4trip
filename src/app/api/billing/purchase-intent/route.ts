/**
 * POST /api/billing/purchase-intent
 * 
 * Purpose: Unified purchase flow for one-off credits + club subscriptions
 * Spec: Billing v4
 * 
 * Supports:
 * - EVENT_UPGRADE_500 (one-off credit)
 * - CLUB_50, CLUB_500, CLUB_UNLIMITED (club subscriptions)
 * 
 * Returns: transaction details + payment provider info
 * 
 * Protected by middleware - requires valid JWT
 * 
 * Phase P1.1: Refactored to use Payment Provider Abstraction
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { resolveCurrentUser } from "@/lib/auth/resolveCurrentUser";
import { respondSuccess, respondError } from "@/lib/api/response";
import { UnauthorizedError, ValidationError, NotFoundError, InternalError, ForbiddenError } from "@/lib/errors";
import { getAdminDb } from "@/lib/db/client";
import { getProductByCode } from "@/lib/db/billingProductsRepo";
import { getPlanById } from "@/lib/db/planRepo";
import { getUserClubRole } from "@/lib/db/clubMemberRepo";
import { getPaymentProvider } from "@/lib/payments";
import { logger } from "@/lib/utils/logger";
import type { ProductCode } from "@/lib/types/billing";

// ============================================================================
// Request Schema
// ============================================================================

const purchaseIntentSchema = z.object({
  product_code: z.string(),
  quantity: z.number().int().positive().default(1),
  context: z.object({
    eventId: z.string().optional(),
    clubId: z.string().optional(),
  }).optional(),
});

type PurchaseIntentRequest = z.infer<typeof purchaseIntentSchema>;

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication required (canonical auth resolution per ADR-001)
    const currentUser = await resolveCurrentUser(req);
    if (!currentUser) {
      throw new UnauthorizedError("Authentication required");
    }

    // 2. Parse request
    const body = await req.json();
    const parsed = purchaseIntentSchema.safeParse(body);
    
    if (!parsed.success) {
      throw new ValidationError("Invalid request", parsed.error.flatten());
    }

    const { product_code, quantity, context } = parsed.data;

    // 3. Validate product_code and determine type
    const isOneOff = product_code === "EVENT_UPGRADE_500";
    const isClub = product_code.startsWith("CLUB_");

    if (!isOneOff && !isClub) {
      throw new ValidationError(`Unknown product code: ${product_code}`);
    }

    // 4. Load product details and calculate amount
    let amount: number;
    let title: string;

    if (isOneOff) {
      // One-off credit from billing_products
      const product = await getProductByCode(product_code);
      
      if (!product) {
        throw new NotFoundError(`Product ${product_code} not found`);
      }

      if (!product.isActive) {
        throw new ValidationError(`Product ${product_code} is not available`);
      }

      amount = product.price * quantity;
      title = product.title;

    } else {
      // Club subscription from club_plans
      const planId = product_code.toLowerCase().replace("club_", "club_");
      const plan = await getPlanById(planId as any);

      if (!plan) {
        throw new NotFoundError(`Plan ${planId} not found`);
      }

      amount = plan.priceMonthly;
      title = plan.title;

      // For clubs, quantity must be 1 (one month)
      if (quantity !== 1) {
        throw new ValidationError("Club subscriptions must have quantity=1");
      }

      // Authorization: Only club owner can purchase subscription
      // Per BILLING_AUDIT_REPORT.md GAP-2 and SSOT_ARCHITECTURE.md §8.4
      if (!context?.clubId) {
        throw new ValidationError("clubId is required for club subscription purchase");
      }

      const role = await getUserClubRole(context.clubId, currentUser.id);
      if (role !== "owner") {
        logger.warn("Club subscription purchase denied: not owner", {
          clubId: context.clubId,
          requestingUserId: currentUser.id,
          userRole: role,
        });
        throw new ForbiddenError("Only club owner can purchase subscription");
      }
    }

    // 5. Get payment provider (P1.1: Provider Abstraction)
    const provider = await getPaymentProvider('kaspi');
    
    // 6. Create payment intent via provider
    // Note: We need transactionId for provider, but DB generates it.
    // So we generate provider payment ID first, then create transaction.
    const tempTransactionId = crypto.randomUUID(); // Temporary for provider call
    
    const paymentIntent = await provider.createPaymentIntent({
      transactionId: tempTransactionId, // Will be replaced with real ID
      amount,
      currencyCode: "KZT",
      title,
    });

    // 7. Create billing_transaction (pending) with provider details
    const db = getAdminDb();

    const { data: transaction, error: txError } = await db
      .from("billing_transactions")
      .insert({
        club_id: context?.clubId ?? null,
        user_id: isOneOff ? currentUser.id : null,
        product_code: product_code as ProductCode,
        plan_id: isClub ? product_code.toLowerCase().replace("club_", "club_") : null,
        amount: amount,
        currency_code: "KZT",
        status: "pending",
        provider: paymentIntent.provider,
        provider_payment_id: paymentIntent.providerPaymentId,
      })
      .select()
      .single();

    if (txError || !transaction) {
      logger.error("Failed to create billing transaction", { error: txError });
      throw new InternalError("Failed to create transaction");
    }

    logger.info("Purchase intent created", {
      transactionId: transaction.id,
      productCode: product_code,
      amount,
      provider: paymentIntent.provider,
      userId: currentUser.id,
    });

    // 8. Build payment response (compatible with existing format)
    const paymentResponse = {
      provider: paymentIntent.provider,
      invoice_url: paymentIntent.paymentUrl,
      qr_payload: paymentIntent.payload?.qr_payload,
      instructions: paymentIntent.instructions,
      dev_note: paymentIntent.payload?.dev_note?.toString().replace(
        tempTransactionId,
        transaction.id
      ),
    };

    // 9. Return transaction + payment details
    return respondSuccess({
      transaction_id: transaction.id,
      transaction_reference: paymentIntent.providerPaymentId,
      payment: paymentResponse,
    });

  } catch (error) {
    logger.error("Purchase intent failed", { error });
    return respondError(error, "Failed to create purchase intent");
  }
}

// ============================================================================
// Note: Kaspi stub helpers moved to src/lib/payments/providers/stubProvider.ts
// as part of Phase P1.1 Payment Provider Abstraction
// ============================================================================
