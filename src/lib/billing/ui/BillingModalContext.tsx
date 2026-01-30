/**
 * Billing Modal Context & Provider
 * 
 * Global state management for Paywall and Credit Confirmation modals.
 * 
 * SSOT: SSOT_ARCHITECTURE.md §15 (Aborted/Incomplete Actions)
 * - Explicit abort (close modal) = silent return (no hint, no toast)
 * - No double-submit (pending state management)
 */

"use client";

import * as React from "react";
import type { PaywallDetails, CreditConfirmationDetails } from "./types";

// ============================================================================
// Types
// ============================================================================

type ModalType = "paywall" | "credit_confirmation" | null;

interface BillingModalState {
  /** Currently open modal type */
  modalType: ModalType;
  
  /** Paywall details (when modalType === "paywall") */
  paywallDetails: PaywallDetails | null;
  
  /** Credit confirmation details (when modalType === "credit_confirmation") */
  creditDetails: CreditConfirmationDetails | null;
  
  /** Callback for credit confirmation */
  onConfirmCredit: ((details: CreditConfirmationDetails) => Promise<void>) | null;
  
  /** Context for pricing navigation */
  context: { clubId?: string } | null;
}

interface BillingModalContextValue extends BillingModalState {
  /**
   * Open Paywall modal with details.
   * 
   * @param details - PaywallDetails from API error
   * @param context - Additional context (clubId for pricing navigation)
   */
  openPaywall: (details: PaywallDetails, context?: { clubId?: string }) => void;
  
  /**
   * Open Credit Confirmation modal.
   * 
   * @param details - CreditConfirmationDetails from API error
   * @param onConfirm - Callback when user confirms credit consumption
   */
  openCreditConfirmation: (
    details: CreditConfirmationDetails,
    onConfirm: (details: CreditConfirmationDetails) => Promise<void>
  ) => void;
  
  /**
   * Close any open modal.
   * Per SSOT_ARCHITECTURE §15: explicit abort = silent return.
   */
  closeModal: () => void;
}

// ============================================================================
// Context
// ============================================================================

const BillingModalContext = React.createContext<BillingModalContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface BillingModalProviderProps {
  children: React.ReactNode;
}

export function BillingModalProvider({ children }: BillingModalProviderProps) {
  const [state, setState] = React.useState<BillingModalState>({
    modalType: null,
    paywallDetails: null,
    creditDetails: null,
    onConfirmCredit: null,
    context: null,
  });
  
  const openPaywall = React.useCallback((
    details: PaywallDetails,
    context?: { clubId?: string }
  ) => {
    setState({
      modalType: "paywall",
      paywallDetails: details,
      creditDetails: null,
      onConfirmCredit: null,
      context: context || null,
    });
  }, []);
  
  const openCreditConfirmation = React.useCallback((
    details: CreditConfirmationDetails,
    onConfirm: (details: CreditConfirmationDetails) => Promise<void>
  ) => {
    setState({
      modalType: "credit_confirmation",
      paywallDetails: null,
      creditDetails: details,
      onConfirmCredit: onConfirm,
      context: null,
    });
  }, []);
  
  const closeModal = React.useCallback(() => {
    // SSOT_ARCHITECTURE §15: Explicit abort = silent return (no hint, no toast)
    setState({
      modalType: null,
      paywallDetails: null,
      creditDetails: null,
      onConfirmCredit: null,
      context: null,
    });
  }, []);
  
  const value: BillingModalContextValue = React.useMemo(() => ({
    ...state,
    openPaywall,
    openCreditConfirmation,
    closeModal,
  }), [state, openPaywall, openCreditConfirmation, closeModal]);
  
  return (
    <BillingModalContext.Provider value={value}>
      {children}
    </BillingModalContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access billing modal controls.
 * 
 * @throws Error if used outside BillingModalProvider
 * 
 * @example
 * ```typescript
 * const { openPaywall, closeModal } = useBillingModals();
 * 
 * // In error handler:
 * if (isPaywallApiError(err)) {
 *   const details = extractPaywallDetails(err);
 *   if (details) openPaywall(details, { clubId });
 * }
 * ```
 */
export function useBillingModals(): BillingModalContextValue {
  const context = React.useContext(BillingModalContext);
  
  if (!context) {
    throw new Error(
      "useBillingModals must be used within a BillingModalProvider. " +
      "Ensure BillingModalHost is rendered in your app layout."
    );
  }
  
  return context;
}

/**
 * Hook to access billing modal state (read-only).
 * Safe to use - returns null if no provider.
 */
export function useBillingModalState(): BillingModalState | null {
  const context = React.useContext(BillingModalContext);
  return context;
}

// ============================================================================
// Display Name for DevTools
// ============================================================================

BillingModalProvider.displayName = "BillingModalProvider";
