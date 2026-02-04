/**
 * Payment Provider Abstraction (Phase P1.1)
 * 
 * Purpose: Define contract for payment providers.
 * This abstraction enables switching between stub and real providers.
 * 
 * Ref: docs/phase/p1/PHASE_P1_D_PAYMENT_PROVIDER_ARCH_DIAGNOSTIC.md
 * 
 * SCOPE: Foundation only. No simulation, no real Kaspi integration.
 */

import "server-only";

// ============================================================================
// Payment Intent Types
// ============================================================================

/**
 * Input for creating a payment intent
 * 
 * Note: This is intentionally minimal. Do NOT extend without explicit GO.
 */
export interface CreatePaymentIntentInput {
  /** Transaction ID (UUID) - used for reference */
  transactionId: string;
  
  /** Amount in currency units */
  amount: number;
  
  /** Currency code (e.g., "KZT") */
  currencyCode: string;
  
  /** Human-readable payment title */
  title: string;
}

/**
 * Output from creating a payment intent
 * 
 * Note: This is intentionally minimal. Do NOT extend without explicit GO.
 */
export interface CreatePaymentIntentOutput {
  /** Provider identifier (e.g., "kaspi", "simulation") */
  provider: string;
  
  /** Provider-specific payment reference ID */
  providerPaymentId: string;
  
  /** URL for user to complete payment (optional - not all providers use URLs) */
  paymentUrl?: string;
  
  /** Provider-specific payload (e.g., QR data) */
  payload?: Record<string, unknown>;
  
  /** Human-readable instructions */
  instructions: string;
}

// ============================================================================
// Payment Provider Interface
// ============================================================================

/**
 * Payment Provider Contract
 * 
 * Implementations MUST:
 * - Generate unique providerPaymentId values
 * - Return consistent provider identifier
 * - NOT modify billing_transactions directly (that's API layer responsibility)
 * 
 * Current implementations:
 * - StubProvider (P1.1): Current hardcoded stub logic
 * 
 * Future implementations (OUT OF SCOPE for P1.1):
 * - SimulationProvider (P1.2)
 * - KaspiProvider (P1.3)
 */
export interface PaymentProvider {
  /**
   * Provider identifier (e.g., "kaspi", "simulation")
   * Used to populate billing_transactions.provider
   */
  readonly providerId: string;
  
  /**
   * Create a payment intent
   * 
   * This does NOT create the transaction record - that's done by the API layer.
   * This only generates provider-specific payment details.
   * 
   * @param input - Payment intent parameters
   * @returns Provider-specific payment details
   */
  createPaymentIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentOutput>;
}

// ============================================================================
// Provider Registry (for future use)
// ============================================================================

/**
 * Available provider IDs
 * 
 * Current: Only 'kaspi' (stub)
 * Future: 'simulation', 'kaspi_real' (OUT OF SCOPE for P1.1)
 */
export type ProviderId = 'kaspi';

/**
 * Get provider instance by ID
 * 
 * Note: For P1.1, this always returns StubProvider.
 * Provider selection logic will be added in future phases.
 */
export async function getPaymentProvider(providerId: ProviderId): Promise<PaymentProvider> {
  // P1.1: Only stub provider exists
  // Future phases will add provider selection logic
  const { StubProvider } = await import('./stubProvider');
  return new StubProvider();
}
