/**
 * Credit Confirmation Modal v2
 * 
 * Purpose: Warn user that publishing will consume a one-off credit
 * Triggered by: 409 CREDIT_CONFIRMATION_REQUIRED from API
 * 
 * v2 Changes (B5.0):
 * - Uses canonical UI config from lib/billing/ui/reasonMapping
 * - Supports CreditConfirmationDetails type
 * - Implements abort semantics per SSOT_ARCHITECTURE §15
 * 
 * SSOT: PHASE_B3-3_REASON_MESSAGE_CTA_MATRIX.md (Task 3)
 */

'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, CreditCard } from 'lucide-react';
import type { CreditCode } from '@/lib/types/billing';
import type { CreditConfirmationDetails } from '@/lib/billing/ui/types';
import { getCreditConfirmationUiConfig } from '@/lib/billing/ui/reasonMapping';

// ============================================================================
// Props Types
// ============================================================================

/**
 * Legacy props interface (backward compatible)
 */
export interface CreditConfirmationModalPropsLegacy {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creditCode: CreditCode;
  eventId: string;
  requestedParticipants: number;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * New props interface using CreditConfirmationDetails
 */
export interface CreditConfirmationModalPropsNew {
  open: boolean;
  onClose: () => void;
  details: CreditConfirmationDetails;
  onConfirm: (details: CreditConfirmationDetails) => Promise<void>;
  isLoading?: boolean;
}

export type CreditConfirmationModalProps = 
  | CreditConfirmationModalPropsLegacy 
  | CreditConfirmationModalPropsNew;

function isNewProps(props: CreditConfirmationModalProps): props is CreditConfirmationModalPropsNew {
  return 'details' in props;
}

const CREDIT_LABELS: Record<string, string> = {
  EVENT_UPGRADE_500: 'Event Upgrade 500',
};

const CREDIT_DESCRIPTIONS: Record<string, string> = {
  EVENT_UPGRADE_500: 'Возможность опубликовать событие с количеством участников до 500',
};

export function CreditConfirmationModal(props: CreditConfirmationModalProps) {
  const [isConfirming, setIsConfirming] = React.useState(false);
  
  // Normalize props
  const isNew = isNewProps(props);
  const open = props.open;
  const externalLoading = props.isLoading ?? false;
  
  // Extract data based on props type
  const creditCode = isNew 
    ? props.details.meta.creditCode 
    : props.creditCode;
  const requestedParticipants = isNew 
    ? props.details.meta.requestedParticipants 
    : props.requestedParticipants;
  
  // Get UI config from canonical mapping
  const uiConfig = getCreditConfirmationUiConfig({
    creditCode,
    requestedParticipants,
  });
  
  const creditLabel = CREDIT_LABELS[creditCode] || creditCode;
  const creditDescription = CREDIT_DESCRIPTIONS[creditCode] || '';
  
  // Handle close - SSOT_ARCHITECTURE §15: explicit abort = silent return
  const handleClose = () => {
    if (isNew) {
      props.onClose();
    } else {
      props.onCancel();
    }
  };
  
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      handleClose();
    }
  };
  
  // Handle confirm
  const handleConfirm = async () => {
    if (isNew) {
      setIsConfirming(true);
      try {
        await props.onConfirm(props.details);
      } finally {
        setIsConfirming(false);
      }
    } else {
      props.onConfirm();
    }
  };
  
  const isLoading = externalLoading || isConfirming;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="heading-h3 flex items-center gap-3">
            <div className="p-2 bg-[var(--color-primary-bg)] rounded-full">
              <CreditCard className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            {uiConfig.title}
          </DialogTitle>
          <DialogDescription className="text-body-small">
            {uiConfig.message}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* Warning Box */}
          <div className="flex gap-3 p-4 bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)] rounded-lg">
            <AlertCircle className="w-5 h-5 text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium text-[var(--color-warning-text)]">Обратите внимание</p>
              <p className="text-[var(--color-warning-text)]">
                После подтверждения опция будет применена к этому событию и не сможет быть использована повторно.
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
            <span className="text-muted-foreground">Опция:</span>
            <span className="font-medium text-[var(--color-text)]">{creditLabel}</span>
            
            {creditDescription && (
              <>
                <span className="text-muted-foreground">Описание:</span>
                <span className="text-[var(--color-text)]">{creditDescription}</span>
              </>
            )}
            
            {requestedParticipants > 0 && (
              <>
                <span className="text-muted-foreground">Участников:</span>
                <span className="font-medium text-[var(--color-text)]">{requestedParticipants}</span>
              </>
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {uiConfig.cancelLabel}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]"
          >
            {isLoading ? 'Сохранение...' : uiConfig.confirmCta}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Hook for easy usage (Legacy - kept for backward compatibility)
// ============================================================================

/**
 * @deprecated Use useBillingModals() from lib/billing/ui instead
 */
export function useCreditConfirmation() {
  const [modalState, setModalState] = React.useState<{
    open: boolean;
    creditCode?: CreditCode;
    eventId?: string;
    requestedParticipants?: number;
    onConfirm?: () => void;
  }>({
    open: false,
  });

  const showConfirmation = React.useCallback((data: {
    creditCode: CreditCode;
    eventId: string;
    requestedParticipants: number;
    onConfirm?: () => void;
  }) => {
    setModalState({
      open: true,
      ...data,
    });
  }, []);

  const hideConfirmation = React.useCallback(() => {
    setModalState({ open: false });
  }, []);

  return {
    modalState,
    showConfirmation,
    hideConfirmation,
    CreditConfirmationModalComponent: modalState.open && modalState.creditCode ? (
      <CreditConfirmationModal
        open={modalState.open}
        onOpenChange={hideConfirmation}
        creditCode={modalState.creditCode}
        eventId={modalState.eventId!}
        requestedParticipants={modalState.requestedParticipants!}
        onConfirm={modalState.onConfirm ?? (() => {})}
        onCancel={hideConfirmation}
      />
    ) : null,
  };
}

