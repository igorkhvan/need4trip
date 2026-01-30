/**
 * Billing UI Infrastructure — Public API
 * 
 * SSOT_ARCHITECTURE.md Ownership: This module owns billing error UI handling.
 * 
 * Exports:
 * - Types (client-safe)
 * - Type guards and parsing utilities
 * - Reason → UI mapping
 * - Modal context and provider
 * - handleApiError hook
 */

// ============================================================================
// Types
// ============================================================================

export type {
  PaywallDetails,
  CreditConfirmationDetails,
  ParsedApiError,
  PaywallOptionParsed,
  BillingUiPattern,
  HandleApiErrorResult,
  HandleApiErrorOptions,
} from "./types";

// Re-export billing types for convenience
export type {
  PaywallReason,
  PaywallOptionType,
  PaywallOption,
  CreditConfirmationReason,
  PlanId,
  CreditCode,
} from "@/lib/types/billing";

// ============================================================================
// Type Guards & Parsing
// ============================================================================

export {
  isApiErrorResponse,
  isPaywallApiError,
  isCreditConfirmationApiError,
  extractPaywallDetails,
  extractCreditConfirmationDetails,
  parseApiErrorResponse,
  getErrorStatusCode,
} from "./parseApiError";

// ============================================================================
// Reason → UI Mapping
// ============================================================================

export {
  getPaywallUiConfig,
  getCreditConfirmationUiConfig,
  REASON_CONFIG,
  PLAN_LABELS,
} from "./reasonMapping";

export type {
  ReasonUiConfig,
  NormalizedPaywallUi,
  CreditConfirmationUiConfig,
} from "./reasonMapping";

// ============================================================================
// Modal Context
// ============================================================================

export {
  BillingModalProvider,
  useBillingModals,
  useBillingModalState,
} from "./BillingModalContext";

// ============================================================================
// Error Handler
// ============================================================================

export {
  handleApiErrorCore,
  isBillingRelatedError,
  canHandleApiError,
} from "./handleApiError";

export {
  useHandleApiError,
  useHandlePaywallError,
} from "./useHandleApiError";
