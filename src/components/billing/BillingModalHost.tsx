/**
 * Billing Modal Host
 * 
 * Global provider + modal host for Paywall and Credit Confirmation modals.
 * Render this component once in your app layout (or a top-level client wrapper).
 * 
 * Usage:
 * ```tsx
 * // In layout or providers:
 * <BillingModalHost>
 *   {children}
 * </BillingModalHost>
 * 
 * // In any child component:
 * const { handleError } = useHandleApiError({ clubId });
 * handleError(err); // Automatically shows modal if 402/409
 * ```
 * 
 * SSOT: SSOT_ARCHITECTURE.md §15 (Aborted/Incomplete Actions)
 */

"use client";

import * as React from "react";
import { 
  BillingModalProvider, 
  useBillingModals 
} from "@/lib/billing/ui/BillingModalContext";
import { PaywallModal } from "./paywall-modal";
import { CreditConfirmationModal } from "./credit-confirmation-modal";

// ============================================================================
// Modal Renderer (Internal)
// ============================================================================

function BillingModalsRenderer() {
  const {
    modalType,
    paywallDetails,
    creditDetails,
    onConfirmCredit,
    onBetaContinue,
    context,
    closeModal,
  } = useBillingModals();
  
  return (
    <>
      {/* Paywall Modal */}
      {modalType === "paywall" && paywallDetails && (
        <PaywallModal
          open={true}
          onClose={closeModal}
          details={paywallDetails}
          context={context ?? undefined}
          onBetaContinue={onBetaContinue ?? undefined}
        />
      )}
      
      {/* Credit Confirmation Modal */}
      {modalType === "credit_confirmation" && creditDetails && onConfirmCredit && (
        <CreditConfirmationModal
          open={true}
          onClose={closeModal}
          details={creditDetails}
          onConfirm={async (details) => {
            await onConfirmCredit(details);
            closeModal();
          }}
        />
      )}
    </>
  );
}

// ============================================================================
// Main Host Component
// ============================================================================

interface BillingModalHostProps {
  children: React.ReactNode;
}

/**
 * Billing Modal Host
 * 
 * Wraps children with BillingModalProvider and renders modals globally.
 * Must be rendered once in the app tree (typically in layout or root providers).
 */
export function BillingModalHost({ children }: BillingModalHostProps) {
  return (
    <BillingModalProvider>
      {children}
      <BillingModalsRendererWrapper />
    </BillingModalProvider>
  );
}

// Wrapper to ensure modals are rendered inside provider
function BillingModalsRendererWrapper() {
  return <BillingModalsRenderer />;
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

export { useBillingModals } from "@/lib/billing/ui/BillingModalContext";
export { useHandleApiError, useHandlePaywallError } from "@/lib/billing/ui/useHandleApiError";
