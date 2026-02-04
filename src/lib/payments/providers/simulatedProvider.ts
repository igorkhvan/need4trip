/**
 * Simulated Payment Provider (Phase P1.2A)
 * 
 * Purpose: Payment provider for simulation mode that auto-settles immediately.
 * 
 * Behavior:
 * - provider = 'simulated'
 * - providerPaymentId format: SIM_{timestamp}_{random}
 * - Settlement happens INSIDE createPaymentIntent() (provider-internal)
 * 
 * This provider allows testing the full payment flow without external provider
 * interaction. Settlement happens server-side via SettlementOrchestrator.
 * 
 * P1.2A: Settlement moved from API layer into provider (no shouldAutoSettle flag).
 * 
 * Ref: docs/phase/p1/PHASE_P1_2_SIMULATED_PAYMENT_PROVIDER.md
 * Ref: docs/phase/p1/PHASE_P1_1_PAYMENT_PROVIDER_ABSTRACTION.md
 */

import "server-only";
import type { 
  PaymentProvider, 
  CreatePaymentIntentInput, 
  CreatePaymentIntentOutput 
} from "./paymentProvider";
import { markTransactionCompleted } from "@/lib/db/billingTransactionsRepo";
import { settleTransaction } from "../settlementOrchestrator";
import { logger } from "@/lib/utils/logger";
import type { BillingTransaction, ProductCode, PlanId } from "@/lib/types/billing";

// ============================================================================
// Simulated Provider Implementation
// ============================================================================

/**
 * Simulated Payment Provider
 * 
 * This provider generates simulated payment details AND performs settlement
 * internally within createPaymentIntent(). Unlike StubProvider (which requires
 * manual settlement), this provider auto-settles the transaction immediately.
 * 
 * Key differences from StubProvider:
 * - provider = 'simulated' (not 'kaspi')
 * - providerPaymentId format: SIM_{timestamp}_{random} (not KASPI_...)
 * - Settlement happens inside createPaymentIntent() (provider-internal)
 * - Requires transactionContext in input for settlement
 * 
 * SAFETY: This provider must NOT be used in production (enforced by
 * getPaymentProviderMode() guard in paymentProvider.ts).
 */
export class SimulatedProvider implements PaymentProvider {
  /** Provider identifier - always 'simulated' for simulation mode */
  readonly providerId = 'simulated';
  
  /**
   * Create a payment intent AND settle immediately (simulation mode)
   * 
   * This method:
   * 1) Generates providerPaymentId: SIM_{timestamp}_{random}
   * 2) Marks transaction completed via billingTransactionsRepo
   * 3) Calls settleTransaction() via SettlementOrchestrator
   * 4) Returns payment details
   * 
   * Settlement is idempotent: if already completed, NO-OP.
   */
  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentOutput> {
    const { transactionId, amount, title, transactionContext } = input;
    
    // Validate transactionContext is provided (required for settlement)
    if (!transactionContext) {
      logger.error("SimulatedProvider: transactionContext is required for settlement", {
        transactionId,
      });
      throw new Error("SimulatedProvider requires transactionContext for settlement");
    }
    
    // Generate provider payment ID (simulation format)
    const providerPaymentId = this.generateProviderPaymentId();
    
    logger.info("SimulatedProvider: Creating payment intent and settling", {
      transactionId,
      providerPaymentId,
      amount,
      title,
    });
    
    // Step 1: Mark transaction as completed via canonical repo function
    await markTransactionCompleted(transactionId, providerPaymentId);
    
    logger.info("SimulatedProvider: Transaction marked as completed", {
      transactionId,
      providerPaymentId,
    });
    
    // Step 2: Build BillingTransaction for settlement
    const transactionForSettlement: BillingTransaction = {
      id: transactionId,
      clubId: transactionContext.clubId,
      userId: transactionContext.userId,
      productCode: transactionContext.productCode as ProductCode,
      planId: transactionContext.planId as PlanId | null,
      amount: amount,
      currencyCode: input.currencyCode,
      status: "completed",
      provider: this.providerId,
      providerPaymentId: providerPaymentId,
      periodStart: null,
      periodEnd: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Step 3: Call settleTransaction via SettlementOrchestrator
    // originalStatus = 'pending' because the transaction was just created
    const settlementResult = await settleTransaction(
      transactionForSettlement,
      "pending",
      { caller: "simulated_provider" }
    );
    
    logger.info("SimulatedProvider: Settlement complete", {
      transactionId,
      settled: settlementResult.settled,
      entitlementType: settlementResult.entitlementType,
      idempotentSkip: settlementResult.idempotentSkip,
    });
    
    // Generate instructions (simulation mode)
    const instructions = [
      `[SIMULATION MODE]`,
      ``,
      `This payment is simulated and has been settled automatically.`,
      `No actual payment is required.`,
      ``,
      `Payment: ${title}`,
      `Amount: ${amount} ₸`,
      `Reference: ${providerPaymentId}`,
      `Status: COMPLETED`,
    ].join("\n");
    
    return {
      provider: this.providerId,
      providerPaymentId,
      // paymentUrl is undefined for simulation (no external payment page)
      paymentUrl: undefined,
      payload: {
        simulation_note: "This is a simulated payment. Already settled.",
        settled: true,
      },
      instructions,
    };
  }
  
  /**
   * Generate provider payment ID (simulation format)
   * 
   * Format: SIM_{timestamp}_{random}
   * Example: SIM_1738665600000_A7BX3K2
   */
  private generateProviderPaymentId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9).toUpperCase();
    return `SIM_${timestamp}_${random}`;
  }
}
