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
  EVENT_UPGRADE_500: 'Позволяет опубликовать событие с до 500 участников',
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
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-full">
              <CreditCard className="w-5 h-5 text-orange-600" />
            </div>
            <DialogTitle>Подтвердите использование кредита</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            Для публикации этого события будет использован один кредит <strong>{creditLabel}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning Box */}
          <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium text-amber-900">Это действие нельзя отменить</p>
              <p className="text-amber-700">
                После подтверждения кредит будет привязан к этому событию и станет недоступен для других событий.
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Кредит:</span>
              <span className="font-medium">{creditLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Описание:</span>
              <span className="text-gray-900">{creditDescription}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Участников:</span>
              <span className="font-medium">{requestedParticipants}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            Отмена
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 bg-orange-600 hover:bg-orange-700"
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

