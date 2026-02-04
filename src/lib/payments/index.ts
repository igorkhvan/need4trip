/**
 * Payment Execution Layer (Phase P1.2)
 * 
 * Public exports for payment provider abstraction.
 * 
 * Module Structure:
 * - providers/paymentProvider.ts - Provider interface + env-based selection
 * - providers/stubProvider.ts - Stub provider implementation (DEV)
 * - providers/simulatedProvider.ts - Simulated provider (auto-settle)
 * - settlementOrchestrator.ts - Centralized settlement logic
 * 
 * Provider selection via PAYMENT_PROVIDER_MODE env var:
 * - "stub" (default): StubProvider (manual settlement)
 * - "simulated": SimulatedProvider (auto-settlement)
 */

import "server-only";

// Provider exports
export type { 
  PaymentProvider, 
  CreatePaymentIntentInput, 
  CreatePaymentIntentOutput,
  ProviderId,
  PaymentProviderMode,
} from "./providers/paymentProvider";

export { getPaymentProvider } from "./providers/paymentProvider";

// Settlement exports
export type { SettlementResult } from "./settlementOrchestrator";
export { settleTransaction } from "./settlementOrchestrator";
