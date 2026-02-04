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
  
  /**
   * Signal for immediate settlement (P1.2)
   * 
   * When true, the API layer should immediately settle the transaction
   * after creation, without waiting for external webhook/callback.
   * 
   * Used by SimulatedProvider for auto-settlement.
   */
  shouldAutoSettle?: boolean;
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
 * Get current payment provider mode from environment
 * 
 * @returns PaymentProviderMode based on PAYMENT_PROVIDER_MODE env var
 */
function getPaymentProviderMode(): PaymentProviderMode {
  const mode = process.env.PAYMENT_PROVIDER_MODE;
  
  if (mode === 'simulated') {
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
