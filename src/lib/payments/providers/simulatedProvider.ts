/**
 * Simulated Payment Provider (Phase P1.2)
 * 
 * Purpose: Payment provider for simulation mode that auto-settles immediately.
 * 
 * Behavior:
 * - provider = 'simulated'
 * - providerPaymentId format: SIM_{timestamp}_{random}
 * - Returns shouldAutoSettle = true (triggers immediate settlement)
 * 
 * This provider allows testing the full payment flow without external provider
 * interaction. Settlement happens server-side via SettlementOrchestrator.
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
import { logger } from "@/lib/utils/logger";

// ============================================================================
// Simulated Provider Implementation
// ============================================================================

/**
 * Simulated Payment Provider
 * 
 * This provider generates simulated payment details and signals for immediate
 * settlement. Unlike StubProvider (which requires manual settlement), this
 * provider auto-settles the transaction immediately after creation.
 * 
 * Key differences from StubProvider:
 * - provider = 'simulated' (not 'kaspi')
 * - providerPaymentId format: SIM_{timestamp}_{random} (not KASPI_...)
 * - Returns shouldAutoSettle = true
 * - Settlement happens synchronously within the purchase-intent request
 */
export class SimulatedProvider implements PaymentProvider {
  /** Provider identifier - always 'simulated' for simulation mode */
  readonly providerId = 'simulated';
  
  /**
   * Create a payment intent (simulation mode)
   * 
   * Generates:
   * - providerPaymentId: SIM_{timestamp}_{random}
   * - paymentUrl: undefined (simulation has no external URL)
   * - shouldAutoSettle: true (triggers immediate settlement)
   * - instructions: Simulation payment instructions
   */
  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentOutput> {
    const { transactionId, amount, title } = input;
    
    // Generate provider payment ID (simulation format)
    const providerPaymentId = this.generateProviderPaymentId();
    
    logger.info("SimulatedProvider: Creating payment intent", {
      transactionId,
      providerPaymentId,
      amount,
      title,
    });
    
    // Generate instructions (simulation mode)
    const instructions = [
      `[SIMULATION MODE]`,
      ``,
      `This payment is simulated and will be settled automatically.`,
      `No actual payment is required.`,
      ``,
      `Payment: ${title}`,
      `Amount: ${amount} ₸`,
      `Reference: ${providerPaymentId}`,
    ].join("\n");
    
    return {
      provider: this.providerId,
      providerPaymentId,
      // paymentUrl is undefined for simulation (no external payment page)
      // API response shape still works - paymentUrl is already optional
      paymentUrl: undefined,
      payload: {
        simulation_note: "This is a simulated payment. Auto-settling immediately.",
        auto_settle: true,
      },
      instructions,
      // Signal for auto-settlement (P1.2 extension)
      shouldAutoSettle: true,
    } as CreatePaymentIntentOutput;
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
