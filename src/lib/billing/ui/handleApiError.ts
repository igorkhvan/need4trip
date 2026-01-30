/**
 * handleApiError — Single Public Entrypoint for Billing Error Handling
 * 
 * SSOT: SSOT_ARCHITECTURE.md §11 (Error Handling)
 * Contract: PHASE_B3-3_REASON_MESSAGE_CTA_MATRIX.md
 * 
 * This is the ONLY function pages should call to handle billing-related API errors.
 * It abstracts away the complexity of:
 * - Type detection (402 vs 409 vs other)
 * - Details extraction
 * - Modal opening
 * - Fallback behavior
 * 
 * @example
 * ```typescript
 * const { handleError } = useHandleApiError({ clubId });
 * 
 * try {
 *   await saveEvent(data);
 * } catch (err) {
 *   const { handled } = handleError(err);
 *   if (!handled) {
 *     toast.error(getErrorMessage(err));
 *   }
 * }
 * ```
 */

import type {
  HandleApiErrorResult,
  HandleApiErrorOptions,
  CreditConfirmationDetails,
} from "./types";
import {
  isPaywallApiError,
  isCreditConfirmationApiError,
  extractPaywallDetails,
  extractCreditConfirmationDetails,
  getErrorStatusCode,
} from "./parseApiError";

// ============================================================================
// Standalone Function (requires modal opener)
// ============================================================================

/**
 * Process an API error and determine if it should be handled by billing UI.
 * 
 * This is a pure function that doesn't open modals directly.
 * Use the hook version (useHandleApiError) for integrated modal handling.
 * 
 * @param error - Any error from API call (ClientError, Response, or raw JSON)
 * @param options - Handling options
 * @param modalOpener - Callbacks to open modals
 * @returns Result indicating if error was handled
 */
export function handleApiErrorCore(
  error: unknown,
  options: HandleApiErrorOptions,
  modalOpener: {
    openPaywall: (details: NonNullable<ReturnType<typeof extractPaywallDetails>>, context?: { clubId?: string }) => void;
    openCreditConfirmation: (details: CreditConfirmationDetails, onConfirm: (d: CreditConfirmationDetails) => Promise<void>) => void;
  }
): HandleApiErrorResult {
  // Check for Paywall error (402)
  if (isPaywallApiError(error)) {
    const details = extractPaywallDetails(error);
    
    if (details) {
      modalOpener.openPaywall(details, { clubId: options.clubId });
      return { handled: true, kind: "paywall" };
    }
    
    // Paywall detected but couldn't extract details
    // Fall back to generic pricing navigation
    console.warn("[handleApiError] Paywall error detected but details extraction failed");
    return { handled: false };
  }
  
  // Check for Credit Confirmation error (409)
  if (isCreditConfirmationApiError(error)) {
    const details = extractCreditConfirmationDetails(error);
    
    if (details) {
      // Check if onConfirmCredit callback is provided
      if (!options.onConfirmCredit) {
        // Dev-only error to catch missing callback
        if (process.env.NODE_ENV === "development") {
          console.error(
            "[handleApiError] 409 CREDIT_CONFIRMATION_REQUIRED received but no onConfirmCredit callback provided. " +
            "Pass onConfirmCredit option to handle credit confirmation."
          );
        }
        return { handled: false };
      }
      
      modalOpener.openCreditConfirmation(details, options.onConfirmCredit);
      return { handled: true, kind: "credit_confirmation" };
    }
    
    // Credit confirmation detected but couldn't extract details
    console.warn("[handleApiError] Credit confirmation error detected but details extraction failed");
    return { handled: false };
  }
  
  // Not a billing error - not handled
  const statusCode = getErrorStatusCode(error);
  
  // Call fallback handler if provided
  if (options.onFallback && statusCode !== null) {
    // Only call fallback for known error status codes
    if (statusCode >= 400) {
      options.onFallback(error);
    }
  }
  
  return { handled: false };
}

// ============================================================================
// Hook Version (integrated with BillingModalContext)
// ============================================================================

// Note: The hook version is exported from the main index.ts after importing
// the context. This avoids circular dependency issues.

// ============================================================================
// Utility: Check if Error is Billing-Related
// ============================================================================

/**
 * Check if an error is billing-related (402 or 409 CREDIT_CONFIRMATION).
 * Useful for pre-filtering before calling handleApiError.
 */
export function isBillingRelatedError(error: unknown): boolean {
  return isPaywallApiError(error) || isCreditConfirmationApiError(error);
}

/**
 * Check if error is something handleApiError can process.
 * Returns true for 402 PAYWALL and 409 CREDIT_CONFIRMATION_REQUIRED.
 */
export function canHandleApiError(error: unknown): boolean {
  return isBillingRelatedError(error);
}
