/**
 * Paywall Modal Component
 * 
 * Shows when user hits billing limit (402 Payment Required)
 * Source: docs/BILLING_AND_LIMITS.md v2.0
 */

"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PaywallError as PaywallErrorType } from "@/lib/types/billing";
import { getClubPlanLabel } from "@/lib/types/club";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  error: PaywallErrorType;
}

const REASON_MESSAGES: Record<string, { title: string; description: string }> = {
  PAID_EVENTS_NOT_ALLOWED: {
    title: "Платные события недоступны",
    description: "Для создания платных событий требуется план Club 50 или выше.",
  },
  CSV_EXPORT_NOT_ALLOWED: {
    title: "CSV экспорт недоступен",
    description: "Экспорт участников в CSV требует план Club 50 или выше.",
  },
  MAX_EVENT_PARTICIPANTS_EXCEEDED: {
    title: "Превышен лимит участников",
    description: "Ваш текущий план не поддерживает такое количество участников.",
  },
  MAX_CLUB_MEMBERS_EXCEEDED: {
    title: "Превышен лимит организаторов",
    description: "Достигнут максимум организаторов для вашего плана.",
  },
  SUBSCRIPTION_NOT_ACTIVE: {
    title: "Подписка неактивна",
    description: "Для выполнения этого действия требуется активная подписка.",
  },
  SUBSCRIPTION_EXPIRED: {
    title: "Подписка истекла",
    description: "Ваша подписка истекла. Пожалуйста, продлите её для продолжения.",
  },
  CLUB_CREATION_REQUIRES_PLAN: {
    title: "Требуется тарифный план",
    description: "Для создания клуба требуется выбрать тарифный план.",
  },
};

export function PaywallModal({ open, onClose, error }: PaywallModalProps) {
  const router = useRouter();
  
  const message = REASON_MESSAGES[error.reason] || {
    title: "Ограничение тарифа",
    description: "Эта функция недоступна на вашем текущем плане.",
  };

  const handleUpgrade = () => {
    onClose();
    router.push(error.cta.href);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="heading-h3">{message.title}</DialogTitle>
          <DialogDescription className="text-body-small">{message.description}</DialogDescription>
        </DialogHeader>

        <div className="py-3 sm:py-4 space-y-2 text-sm">
          {error.currentPlanId && (
            <p>
              <strong>Текущий план:</strong>{" "}
              <span>{getClubPlanLabel(error.currentPlanId)}</span>
            </p>
          )}
          
          {error.requiredPlanId && (
            <p>
              <strong>Требуется:</strong>{" "}
              <span>{getClubPlanLabel(error.requiredPlanId)}</span> или выше
            </p>
          )}

          {error.meta && "limit" in error.meta && "requested" in error.meta && (
            <p className="text-muted-foreground">
              Запрошено: {error.meta.requested as number} / Лимит: {error.meta.limit as number}
            </p>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Отмена
          </Button>
          <Button onClick={handleUpgrade} className="w-full sm:w-auto">
            Посмотреть тарифы
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to handle API errors and show paywall modal
 * 
 * Usage:
 * ```tsx
 * const { showPaywall, PaywallModalComponent } = usePaywall();
 * 
 * try {
 *   await createEvent(...);
 * } catch (err) {
 *   if (err.response?.status === 402) {
 *     showPaywall(err.response.data.error.details);
 *   }
 * }
 * 
 * return <>{PaywallModalComponent}</>;
 * ```
 */
export function usePaywall() {
  const [paywallError, setPaywallError] = React.useState<PaywallErrorType | null>(null);

  const showPaywall = (error: PaywallErrorType) => {
    setPaywallError(error);
  };

  const hidePaywall = () => {
    setPaywallError(null);
  };

  const PaywallModalComponent = paywallError ? (
    <PaywallModal
      open={!!paywallError}
      onClose={hidePaywall}
      error={paywallError}
    />
  ) : null;

  return {
    showPaywall,
    hidePaywall,
    PaywallModalComponent,
  };
}

// Missing React import
import * as React from "react";
