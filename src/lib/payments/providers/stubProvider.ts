/**
 * Stub Payment Provider (Phase P1.1)
 * 
 * Purpose: Extract current stub/hardcoded payment logic into provider abstraction.
 * 
 * Behavior MUST remain identical to pre-P1.1:
 * - provider = 'kaspi'
 * - providerPaymentId format: KASPI_{timestamp}_{random}
 * - paymentUrl format: https://kaspi.kz/pay/{providerPaymentId} (stub)
 * 
 * Ref: docs/phase/p1/PHASE_P1_D_PAYMENT_PROVIDER_ARCH_DIAGNOSTIC.md §3.2
 */

import "server-only";
import type { 
  PaymentProvider, 
  CreatePaymentIntentInput, 
  CreatePaymentIntentOutput 
} from "./paymentProvider";

// ============================================================================
// Stub Provider Implementation
// ============================================================================

/**
 * Stub Payment Provider
 * 
 * This provider generates stub payment URLs for testing.
 * Behavior is identical to the pre-P1.1 hardcoded logic in purchase-intent.
 * 
 * NO behavior changes from existing implementation.
 */
export class StubProvider implements PaymentProvider {
  /** Provider identifier - always 'kaspi' for stub mode */
  readonly providerId = 'kaspi';
  
  /**
   * Create a payment intent (stub mode)
   * 
   * Generates:
   * - providerPaymentId: KASPI_{timestamp}_{random}
   * - paymentUrl: https://kaspi.kz/pay/{providerPaymentId} (stub URL)
   * - instructions: Kaspi payment instructions
   */
  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentOutput> {
    const { transactionId, amount, title } = input;
    
    // Generate provider payment ID (identical to existing format)
    const providerPaymentId = this.generateProviderPaymentId();
    
    // Generate stub payment URL
    const paymentUrl = `https://kaspi.kz/pay/${providerPaymentId}`;
    
    // Generate QR payload (stub)
    const qrPayload = `kaspi://pay/${providerPaymentId}`;
    
    // Generate instructions (identical to existing)
    const instructions = [
      `1. Откройте приложение Kaspi.kz`,
      `2. Перейдите в раздел "Платежи"`,
      `3. Найдите платёж: ${title}`,
      `4. Оплатите ${amount} ₸`,
      ``,
      `Или используйте QR-код для быстрой оплаты.`,
    ].join("\n");
    
    // Dev note for testing (stub mode only)
    const devNote = [
      `DEV MODE: This is a stub payment.`,
      `To complete: POST /api/dev/billing/settle`,
      `Body: { "transaction_id": "${transactionId}", "status": "completed" }`,
    ].join(" ");
    
    return {
      provider: this.providerId,
      providerPaymentId,
      paymentUrl,
      payload: {
        qr_payload: qrPayload,
        dev_note: devNote,
      },
      instructions,
    };
  }
  
  /**
   * Generate provider payment ID
   * 
   * Format: KASPI_{timestamp}_{random}
   * Example: KASPI_1738665600000_A7BX3K2
   * 
   * Identical to existing generateTransactionReference() in purchase-intent.
   */
  private generateProviderPaymentId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9).toUpperCase();
    return `KASPI_${timestamp}_${random}`;
  }
}
