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
 * Phase P1.2A: Settlement moved into provider (no direct DB updates in route)
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
    let planId: string | null = null;

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
      planId = product_code.toLowerCase().replace("club_", "club_");
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

    // 5. Get payment provider (P1.2A: Env-based selection with production guard)
    const provider = await getPaymentProvider();

    // 6. Create billing_transaction FIRST with status='pending'
    // P1.2A: Transaction must exist before calling provider
    // provider_payment_id will be set by provider (for SimulatedProvider via markTransactionCompleted)
    const db = getAdminDb();

    const { data: transaction, error: txError } = await db
      .from("billing_transactions")
      .insert({
        club_id: context?.clubId ?? null,
        user_id: isOneOff ? currentUser.id : null,
        product_code: product_code as ProductCode,
        plan_id: planId,
        amount: amount,
        currency_code: "KZT",
        status: "pending",
        provider: provider.providerId,
        provider_payment_id: null, // Will be set by provider or updated after
      })
      .select()
      .single();

    if (txError || !transaction) {
      logger.error("Failed to create billing transaction", { error: txError });
      throw new InternalError("Failed to create transaction");
    }

    logger.info("Purchase intent: transaction created", {
      transactionId: transaction.id,
      productCode: product_code,
      amount,
      provider: provider.providerId,
      userId: currentUser.id,
    });

    // 7. Call provider.createPaymentIntent() with real transaction ID
    // P1.2A: For SimulatedProvider, this will also settle the transaction internally
    const paymentIntent = await provider.createPaymentIntent({
      transactionId: transaction.id,
      amount,
      currencyCode: "KZT",
      title,
      // P1.2A: Transaction context for provider-internal settlement
      transactionContext: {
        clubId: context?.clubId ?? null,
        userId: isOneOff ? currentUser.id : null,
        productCode: product_code,
        planId: planId,
      },
    });

    // 8. For StubProvider: update transaction with providerPaymentId
    // (SimulatedProvider already updated via markTransactionCompleted)
    if (provider.providerId !== 'simulated' && paymentIntent.providerPaymentId) {
      const { error: updateError } = await db
        .from("billing_transactions")
        .update({
          provider_payment_id: paymentIntent.providerPaymentId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id);
      
      if (updateError) {
        logger.warn("Failed to update provider_payment_id", {
          transactionId: transaction.id,
          error: updateError,
        });
        // Non-fatal: transaction exists, just missing provider_payment_id
      }
    }

    logger.info("Purchase intent completed", {
      transactionId: transaction.id,
      provider: paymentIntent.provider,
      providerPaymentId: paymentIntent.providerPaymentId,
    });

    // 9. Build payment response (compatible with existing format)
    const paymentResponse = {
      provider: paymentIntent.provider,
      invoice_url: paymentIntent.paymentUrl,
      qr_payload: paymentIntent.payload?.qr_payload,
      instructions: paymentIntent.instructions,
      dev_note: paymentIntent.payload?.dev_note,
    };

    // 10. Return transaction + payment details
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
// Note: Settlement logic is now provider-internal (P1.2A)
// - StubProvider: No settlement (manual via /api/dev/billing/settle)
// - SimulatedProvider: Settlement inside createPaymentIntent()
// ============================================================================
