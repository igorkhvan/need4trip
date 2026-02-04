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
 * Note: Extended in P1.2A to support provider-internal settlement.
 */
export interface CreatePaymentIntentInput {
  /** Transaction ID (UUID) - the REAL transaction ID after DB insert */
  transactionId: string;
  
  /** Amount in currency units */
  amount: number;
  
  /** Currency code (e.g., "KZT") */
  currencyCode: string;
  
  /** Human-readable payment title */
  title: string;
  
  /**
   * Transaction context for provider-internal settlement (P1.2A)
   * 
   * Required for SimulatedProvider to perform settlement.
   * StubProvider ignores this field.
   */
  transactionContext?: {
    clubId: string | null;
    userId: string | null;
    productCode: string;
    planId: string | null;
  };
}

/**
 * Output from creating a payment intent
 * 
 * Note: This is intentionally minimal. Do NOT extend without explicit GO.
 * 
 * P1.2A: Removed shouldAutoSettle - settlement is provider-internal behavior,
 * not a signal to the API layer.
 */
export interface CreatePaymentIntentOutput {
  /** Provider identifier (e.g., "kaspi", "simulated") */
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
// Provider Registry (P1.2: Env-based selection)
// ============================================================================

/**
 * Available provider IDs
 * 
 * Current (P1.2):
 * - 'kaspi' (stub provider for DEV testing)
 * - 'simulated' (auto-settle provider for simulation mode)
 * 
 * Future: 'kaspi_real' (OUT OF SCOPE)
 */
export type ProviderId = 'kaspi' | 'simulated';

/**
 * Payment provider mode (env-based)
 * 
 * Controlled by PAYMENT_PROVIDER_MODE env variable.
 * 
 * Values:
 * - "stub" (default): Use StubProvider (manual settlement via DEV endpoint)
 * - "simulated": Use SimulatedProvider (auto-settlement, no external interaction)
 * 
 * Server-side only. NOT user-controlled.
 */
export type PaymentProviderMode = 'stub' | 'simulated';

/**
 * Error thrown when simulated mode is attempted in production
 */
export class SimulatedModeInProductionError extends Error {
  constructor() {
    super(
      "PAYMENT_PROVIDER_MODE='simulated' is NOT allowed in production. " +
      "This is a safety guard to prevent accidental use of simulation mode in prod."
    );
    this.name = "SimulatedModeInProductionError";
  }
}

/**
 * Get current payment provider mode from environment
 * 
 * SAFETY GUARD (P1.2A): Simulated mode is FORBIDDEN in production.
 * If PAYMENT_PROVIDER_MODE='simulated' and NODE_ENV='production', throws error.
 * 
 * @returns PaymentProviderMode based on PAYMENT_PROVIDER_MODE env var
 * @throws SimulatedModeInProductionError if simulated mode in production
 */
function getPaymentProviderMode(): PaymentProviderMode {
  const mode = process.env.PAYMENT_PROVIDER_MODE;
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (mode === 'simulated') {
    // SAFETY GUARD: Simulated mode must NOT run in production
    if (isProduction) {
      throw new SimulatedModeInProductionError();
    }
    return 'simulated';
  }
  
  // Default to stub mode
  return 'stub';
}

/**
 * Get provider instance (env-based selection)
 * 
 * Provider selection is based on PAYMENT_PROVIDER_MODE env variable:
 * - "stub" (default) → StubProvider
 * - "simulated" → SimulatedProvider
 * 
 * @param providerId - Optional override (for future use). If not provided,
 *                     selection is based on env var.
 * @returns PaymentProvider instance
 */
export async function getPaymentProvider(providerId?: ProviderId): Promise<PaymentProvider> {
  // If explicit providerId is passed, use it (for testing/future use)
  const effectiveProviderId = providerId ?? mapModeToProviderId(getPaymentProviderMode());
  
  if (effectiveProviderId === 'simulated') {
    const { SimulatedProvider } = await import('./simulatedProvider');
    return new SimulatedProvider();
  }
  
  // Default: stub provider
  const { StubProvider } = await import('./stubProvider');
  return new StubProvider();
}

/**
 * Map PaymentProviderMode to ProviderId
 */
function mapModeToProviderId(mode: PaymentProviderMode): ProviderId {
  switch (mode) {
    case 'simulated':
      return 'simulated';
    case 'stub':
    default:
      return 'kaspi';
  }
}
