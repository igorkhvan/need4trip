/**
 * Payment Execution Layer (Phase P1.1)
 * 
 * Public exports for payment provider abstraction.
 * 
 * Module Structure:
 * - providers/paymentProvider.ts - Provider interface
 * - providers/stubProvider.ts - Stub provider implementation
 * - settlementOrchestrator.ts - Centralized settlement logic
 */

import "server-only";

// Provider exports
export type { 
  PaymentProvider, 
  CreatePaymentIntentInput, 
  CreatePaymentIntentOutput,
  ProviderId,
} from "./providers/paymentProvider";

export { getPaymentProvider } from "./providers/paymentProvider";

// Settlement exports
export type { SettlementResult } from "./settlementOrchestrator";
export { settleTransaction } from "./settlementOrchestrator";
