/**
 * Credit Confirmation Modal
 * 
 * Purpose: Warn user that publishing will consume a one-off credit
 * Triggered by: 409 CREDIT_CONFIRMATION_REQUIRED from /api/events/:id/publish
 * 
 * Spec: One-off event upgrade billing system
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

export interface CreditConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creditCode: CreditCode;
  eventId: string;
  requestedParticipants: number;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const CREDIT_LABELS: Record<CreditCode, string> = {
  EVENT_UPGRADE_500: 'Event Upgrade 500',
};

const CREDIT_DESCRIPTIONS: Record<CreditCode, string> = {
  EVENT_UPGRADE_500: 'Возможность опубликовать событие с количеством участников до 500',
};

export function CreditConfirmationModal({
  open,
  onOpenChange,
  creditCode,
  eventId,
  requestedParticipants,
  onConfirm,
  onCancel,
  isLoading = false,
}: CreditConfirmationModalProps) {
  const creditLabel = CREDIT_LABELS[creditCode];
  const creditDescription = CREDIT_DESCRIPTIONS[creditCode];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="heading-h3 flex items-center gap-3">
            <div className="p-2 bg-[var(--color-primary-bg)] rounded-full">
              <CreditCard className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            Подтверждение публикации события
          </DialogTitle>
          <DialogDescription className="text-body-small">
            Для публикации этого события будет использована разовая опция <strong>{creditLabel}</strong>.
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
            
            <span className="text-muted-foreground">Описание:</span>
            <span className="text-[var(--color-text)]">{creditDescription}</span>
            
            <span className="text-muted-foreground">Участников:</span>
            <span className="font-medium text-[var(--color-text)]">{requestedParticipants}</span>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Отмена
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]"
          >
            {isLoading ? 'Публикация...' : 'Подтвердить и опубликовать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Hook for easy usage
// ============================================================================

export function useCreditConfirmation() {
  const [modalState, setModalState] = React.useState<{
    open: boolean;
    creditCode?: CreditCode;
    eventId?: string;
    requestedParticipants?: number;
  }>({
    open: false,
  });

  const showConfirmation = React.useCallback((data: {
    creditCode: CreditCode;
    eventId: string;
    requestedParticipants: number;
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
        onConfirm={() => {}}
        onCancel={hideConfirmation}
      />
    ) : null,
  };
}

