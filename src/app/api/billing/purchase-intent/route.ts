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
 * Returns: transaction details + Kaspi payment info (stub)
 * 
 * Protected by middleware - requires valid JWT
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { resolveCurrentUser } from "@/lib/auth/resolveCurrentUser";
import { respondSuccess, respondError } from "@/lib/api/response";
import { UnauthorizedError, ValidationError, NotFoundError, InternalError } from "@/lib/errors";
import { getAdminDb } from "@/lib/db/client";
import { getProductByCode } from "@/lib/db/billingProductsRepo";
import { getPlanById } from "@/lib/db/planRepo";
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
    }

    // 5. Create billing_transaction (pending)
    const db = getAdminDb();
    const transactionReference = generateTransactionReference();

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
        provider: "kaspi",
        provider_payment_id: transactionReference,
      })
      .select()
      .single();

    if (txError || !transaction) {
      logger.error("Failed to create billing transaction", { error: txError });
      throw new InternalError("Failed to create transaction");
    }

    // 6. Generate Kaspi payment details (STUB)
    const kaspiPayment = generateKaspiPaymentStub({
      transactionId: transaction.id,
      transactionReference,
      amount,                         // ⚡ Normalized
      title,
    });

    logger.info("Purchase intent created", {
      transactionId: transaction.id,
      productCode: product_code,
      amount,                         // ⚡ Normalized
      userId: currentUser.id,
    });

    // 7. Return transaction + payment details
    return respondSuccess({
      transaction_id: transaction.id,
      transaction_reference: transactionReference,
      payment: kaspiPayment,
    });

  } catch (error) {
    logger.error("Purchase intent failed", { error });
    return respondError(error, "Failed to create purchase intent");
  }
}

// ============================================================================
// Helpers: Kaspi Stub
// ============================================================================

function generateTransactionReference(): string {
  return `KASPI_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
}

interface KaspiPaymentStub {
  provider: "kaspi";
  invoice_url?: string;
  qr_payload?: string;
  instructions: string;
  dev_note: string;
}

function generateKaspiPaymentStub(params: {
  transactionId: string;
  transactionReference: string;
  amount: number;                     // ⚡ Normalized
  title: string;
}): KaspiPaymentStub {
  const { transactionId, transactionReference, amount, title } = params;

  return {
    provider: "kaspi",
    invoice_url: `https://kaspi.kz/pay/${transactionReference}`, // STUB URL
    qr_payload: `kaspi://pay/${transactionReference}`, // STUB QR
    instructions: [
      `1. Откройте приложение Kaspi.kz`,
      `2. Перейдите в раздел "Платежи"`,
      `3. Найдите платёж: ${title}`,
      `4. Оплатите ${amount} ₸`,          // ⚡ Normalized
      ``,
      `Или используйте QR-код для быстрой оплаты.`,
    ].join("\n"),
    dev_note: [
      `DEV MODE: This is a stub payment.`,
      `To complete: POST /api/dev/billing/settle`,
      `Body: { "transaction_id": "${transactionId}", "status": "completed" }`,
    ].join(" "),
  };
}

