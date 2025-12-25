/**
 * Paywall Modal Component v4
 * 
 * Shows when user hits billing limit (402 Payment Required)
 * Updated: 2024-12-26 - v4 unified purchase-intent + polling
 */

"use client";

import * as React from "react";
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
import { CreditCard, Users, Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { PaywallError as PaywallErrorType, PaywallOption } from "@/lib/types/billing";
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
  PUBLISH_REQUIRES_PAYMENT: {
    title: "Требуется оплата",
    description: "Для публикации этого события выберите один из вариантов оплаты.",
  },
  CLUB_REQUIRED_FOR_LARGE_EVENT: {
    title: "Требуется клуб",
    description: "События с более чем 500 участниками доступны только для клубов.",
  },
};

export function PaywallModal({ open, onClose, error }: PaywallModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [paymentStatus, setPaymentStatus] = React.useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  const [transactionId, setTransactionId] = React.useState<string | null>(null);
  
  const message = REASON_MESSAGES[error.reason] || {
    title: "Ограничение тарифа",
    description: "Эта функция недоступна на вашем текущем плане.",
  };

  // Poll transaction status
  React.useEffect(() => {
    if (!transactionId || paymentStatus !== 'pending') return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/billing/transactions/status?transaction_id=${transactionId}`);
        const data = await response.json();

        if (data.success && data.data.status === 'completed') {
          setPaymentStatus('success');
          clearInterval(pollInterval);
          
          // Refresh page after successful payment
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else if (data.data.status === 'failed' || data.data.status === 'refunded') {
          setPaymentStatus('failed');
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('Failed to poll transaction status', err);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [transactionId, paymentStatus]);

  const handleOptionClick = async (option: PaywallOption) => {
    setIsLoading(true);
    
    if (option.type === "ONE_OFF_CREDIT") {
      // v4: Use unified purchase-intent
      try {
        const response = await fetch("/api/billing/purchase-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_code: option.productCode,
            quantity: 1,
          }),
        });

        const data = await response.json();

        if (data.success && data.data) {
          const { transaction_id, payment } = data.data;
          
          setTransactionId(transaction_id);
          setPaymentStatus('pending');
          setIsLoading(false);

          // Show payment instructions (Kaspi stub)
          if (payment.invoice_url) {
            window.open(payment.invoice_url, '_blank');
          } else if (payment.instructions) {
            alert(payment.instructions);
          }
        } else {
          alert("Ошибка создания платежа");
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Failed to purchase credit", err);
        alert("Ошибка сети");
        setIsLoading(false);
      }
    } else if (option.type === "CLUB_ACCESS") {
      // Navigate to pricing page
      onClose();
      router.push("/pricing");
    }
  };

  const handleLegacyUpgrade = () => {
    onClose();
    router.push(error.cta?.href || "/pricing");
  };

  // Use new options[] if available, fallback to legacy cta
  const hasOptions = error.options && error.options.length > 0;

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

        {hasOptions ? (
          // NEW: Multiple payment options with status
          <div className="space-y-3 py-2">
            {paymentStatus === 'idle' && (
              <>
                <p className="text-sm font-medium text-gray-700">Выберите вариант:</p>
                {error.options!.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleOptionClick(option)}
                    disabled={isLoading}
                    className="w-full flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors text-left disabled:opacity-50"
                  >
                    {option.type === "ONE_OFF_CREDIT" ? (
                      <>
                        <CreditCard className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">Разовая покупка</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {option.priceKzt} ₸ — Кредит для 1 события (до 500 участников)
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Users className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">Доступ через клуб</p>
                          <p className="text-sm text-gray-600 mt-1">
                            Неограниченные события с подпиской клуба
                          </p>
                        </div>
                      </>
                    )}
                  </button>
                ))}
              </>
            )}

            {paymentStatus === 'pending' && (
              <div className="flex flex-col items-center justify-center p-6 bg-blue-50 rounded-lg">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                <p className="text-sm font-medium text-blue-900">Ожидание оплаты...</p>
                <p className="text-xs text-blue-700 mt-1">Завершите оплату в Kaspi</p>
              </div>
            )}

            {paymentStatus === 'success' && (
              <div className="flex flex-col items-center justify-center p-6 bg-green-50 rounded-lg">
                <CheckCircle2 className="w-8 h-8 text-green-600 mb-3" />
                <p className="text-sm font-medium text-green-900">Оплата успешна!</p>
                <p className="text-xs text-green-700 mt-1">Обновляем страницу...</p>
              </div>
            )}

            {paymentStatus === 'failed' && (
              <div className="flex flex-col items-center justify-center p-6 bg-red-50 rounded-lg">
                <XCircle className="w-8 h-8 text-red-600 mb-3" />
                <p className="text-sm font-medium text-red-900">Оплата не прошла</p>
                <p className="text-xs text-red-700 mt-1">Попробуйте ещё раз</p>
              </div>
            )}
          </div>
        ) : (
          // LEGACY: Single CTA button
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Отмена
            </Button>
            <Button onClick={handleLegacyUpgrade} className="w-full sm:w-auto">
              Посмотреть тарифы
            </Button>
          </DialogFooter>
        )}

        {hasOptions && (
          <DialogFooter className="pt-2">
            <Button variant="ghost" onClick={onClose} className="w-full">
              Отмена
            </Button>
          </DialogFooter>
        )}
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
 *     showPaywall(err.response.data.error);
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
