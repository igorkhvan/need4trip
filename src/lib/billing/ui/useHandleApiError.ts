/**
 * useHandleApiError Hook
 * 
 * Integrated hook that connects handleApiError with BillingModalContext.
 * This is the recommended way to handle billing errors in page components.
 * 
 * @example
 * ```typescript
 * function EventForm() {
 *   const { handleError } = useHandleApiError({
 *     clubId: event?.clubId,
 *     onConfirmCredit: async (details) => {
 *       // Re-submit with confirm_credit=1
 *       await saveEvent(data, { confirmCredit: true });
 *     },
 *   });
 *   
 *   const handleSave = async () => {
 *     try {
 *       await saveEvent(data);
 *     } catch (err) {
 *       const { handled } = handleError(err);
 *       if (!handled) {
 *         toast.error(getErrorMessage(err));
 *       }
 *     }
 *   };
 * }
 * ```
 */

"use client";

import * as React from "react";
import { useBillingModals } from "./BillingModalContext";
import { handleApiErrorCore } from "./handleApiError";
import type { HandleApiErrorOptions, HandleApiErrorResult } from "./types";

interface UseHandleApiErrorOptions extends Omit<HandleApiErrorOptions, "onFallback"> {
  /**
   * Fallback handler for non-billing errors.
   * Called for 401/403/404/422/500 etc.
   */
  onFallback?: (error: unknown) => void;
}

interface UseHandleApiErrorReturn {
  /**
   * Handle an API error.
   * Opens billing modal if error is 402 or 409 CREDIT_CONFIRMATION.
   * 
   * @param error - Error from API call
   * @returns Result indicating if error was handled
   */
  handleError: (error: unknown) => HandleApiErrorResult;
}

/**
 * Hook for handling API errors with billing modal integration.
 * 
 * Must be used within BillingModalProvider (rendered by BillingModalHost).
 * 
 * @param options - Handling configuration
 */
export function useHandleApiError(
  options: UseHandleApiErrorOptions = {}
): UseHandleApiErrorReturn {
  const { openPaywall, openCreditConfirmation } = useBillingModals();
  
  // Memoize options to prevent unnecessary re-renders
  const optionsRef = React.useRef(options);
  optionsRef.current = options;
  
  const handleError = React.useCallback((error: unknown): HandleApiErrorResult => {
    const currentOptions = optionsRef.current;
    
    return handleApiErrorCore(
      error,
      {
        clubId: currentOptions.clubId,
        onConfirmCredit: currentOptions.onConfirmCredit,
        onFallback: currentOptions.onFallback,
      },
      {
        openPaywall,
        openCreditConfirmation,
      }
    );
  }, [openPaywall, openCreditConfirmation]);
  
  return { handleError };
}

/**
 * Simplified hook that only handles paywall errors (no credit confirmation).
 * 
 * Use this when you don't need credit confirmation handling.
 */
export function useHandlePaywallError(
  options: { clubId?: string; onFallback?: (error: unknown) => void } = {}
): UseHandleApiErrorReturn {
  const { openPaywall, openCreditConfirmation } = useBillingModals();
  
  const optionsRef = React.useRef(options);
  optionsRef.current = options;
  
  const handleError = React.useCallback((error: unknown): HandleApiErrorResult => {
    const currentOptions = optionsRef.current;
    
    return handleApiErrorCore(
      error,
      {
        clubId: currentOptions.clubId,
        // No onConfirmCredit - 409 will not be handled
        onFallback: currentOptions.onFallback,
      },
      {
        openPaywall,
        openCreditConfirmation,
      }
    );
  }, [openPaywall, openCreditConfirmation]);
  
  return { handleError };
}
