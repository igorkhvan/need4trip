/**
 * Paywall Modal Component v5
 * 
 * Shows when user hits billing limit (402 Payment Required)
 * 
 * v5 Changes (B5.0):
 * - Uses canonical reason mapping from lib/billing/ui/reasonMapping
 * - Implements fallback behavior per B3-3 matrix
 * - Supports both legacy props API and new PaywallDetails API
 * 
 * SSOT: PHASE_B3-3_REASON_MESSAGE_CTA_MATRIX.md
 */

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, Users, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import type { PaywallError as PaywallErrorType, PaywallOption } from "@/lib/types/billing";
import type { PaywallDetails, PaywallOptionParsed } from "@/lib/billing/ui/types";
import { getPaywallUiConfig, BETA_PAYWALL_COPY } from "@/lib/billing/ui/reasonMapping";
import { getClubPlanLabel } from "@/lib/types/club";

// ============================================================================
// Props Types
// ============================================================================

/**
 * Legacy props interface (backward compatible with existing usage)
 */
interface PaywallModalPropsLegacy {
  open: boolean;
  onClose: () => void;
  error: PaywallErrorType;
}

/**
 * New props interface using PaywallDetails
 */
interface PaywallModalPropsNew {
  open: boolean;
  onClose: () => void;
  details: PaywallDetails;
  context?: { clubId?: string };
  /**
   * Beta continuation callback (SOFT_BETA_STRICT).
   * Called after system auto-grant succeeds to resubmit with confirm_credit=true.
   * UX Contract: UX_CONTRACT_PAYWALL_SOFT_BETA_STRICT.md §7.1
   */
  onBetaContinue?: () => Promise<void>;
}

type PaywallModalProps = PaywallModalPropsLegacy | PaywallModalPropsNew;

function isNewProps(props: PaywallModalProps): props is PaywallModalPropsNew {
  return 'details' in props;
}

export function PaywallModal(props: PaywallModalProps) {
  const { open, onClose } = props;
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [paymentStatus, setPaymentStatus] = React.useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  const [transactionId, setTransactionId] = React.useState<string | null>(null);
  
  // Beta state (SOFT_BETA_STRICT)
  const [betaState, setBetaState] = React.useState<'idle' | 'pending' | 'error'>('idle');
  
  // Normalize props to PaywallDetails
  const details: PaywallDetails = isNewProps(props) 
    ? props.details 
    : {
        reason: props.error.reason,
        currentPlanId: props.error.currentPlanId,
        requiredPlanId: props.error.requiredPlanId,
        meta: props.error.meta,
        options: props.error.options?.map(o => ({
          type: o.type as "ONE_OFF_CREDIT" | "CLUB_ACCESS" | "BETA_CONTINUE",
          ...(o.type === 'ONE_OFF_CREDIT' ? {
            productCode: (o as PaywallOption & { productCode?: string }).productCode,
            price: (o as PaywallOption & { price?: number }).price,
            currencyCode: (o as PaywallOption & { currencyCode?: string }).currencyCode,
            provider: (o as PaywallOption & { provider?: string }).provider,
          } : o.type === 'CLUB_ACCESS' ? {
            recommendedPlanId: (o as PaywallOption & { recommendedPlanId?: string }).recommendedPlanId,
          } : {}),
        })) as PaywallOptionParsed[] | undefined,
        cta: props.error.cta,
      };
  
  const context = isNewProps(props) ? props.context : undefined;
  const onBetaContinue = isNewProps(props) ? props.onBetaContinue : undefined;
  
  // Get normalized UI config using B3-3 mapping
  const uiConfig = getPaywallUiConfig(details, context);

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
            router.refresh(); // ⚡ Refresh CurrentUser (with new availableCreditsCount)
          }, 1000);
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

  const handleOptionClick = async (option: PaywallOptionParsed) => {
    setIsLoading(true);
    
    if (option.type === "ONE_OFF_CREDIT" && option.productCode) {
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
      // Navigate to pricing page with context
      onClose();
      const pricingUrl = uiConfig.primaryCta.href || "/pricing";
      router.push(pricingUrl);
    }
  };

  const handleFallbackUpgrade = () => {
    onClose();
    // Use uiConfig fallback CTA or legacy cta
    const href = uiConfig.primaryCta.href || details.cta?.href || "/pricing";
    router.push(href);
  };

  /**
   * Beta continuation handler (SOFT_BETA_STRICT).
   *
   * Flow:
   * 1. Enter PENDING state (block repeated actions)
   * 2. Call POST /api/billing/beta-grant (system auto-grant)
   * 3. On success: call onBetaContinue() (resubmit with confirm_credit=1)
   * 4. On failure: enter ERROR state (loop protection)
   *
   * UX Contract: UX_CONTRACT_PAYWALL_SOFT_BETA_STRICT.md §7.1, §8
   */
  const handleBetaContinue = async () => {
    if (!onBetaContinue) return;

    setBetaState('pending');

    try {
      // Step 1: Auto-grant system credit
      const grantRes = await fetch('/api/billing/beta-grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!grantRes.ok) {
        // Auto-grant failed — enter error state
        setBetaState('error');
        return;
      }

      // Step 2: Resubmit via callback (confirm_credit=true)
      await onBetaContinue();

      // Step 3: Close modal — layout tree persists across client-side navigation
      onClose();
    } catch {
      // Loop protection: resubmit triggered another 402 or other error
      // Enter stable ERROR state per SSOT_UI_STATES.md §4
      setBetaState('error');
    }
  };

  // STRICT SUPPRESSION (UX_CONTRACT_PAYWALL_SOFT_BETA_STRICT §12.2):
  // Defensive filtering at component level — HARD options (ONE_OFF_CREDIT, CLUB_ACCESS)
  // MUST NOT exist in the render tree when isBetaContinue is true.
  // This is a safety net on top of reasonMapping.ts suppression.
  const filteredOptions: PaywallOptionParsed[] = uiConfig.isBetaContinue
    ? uiConfig.options.filter((o) => o.type === "BETA_CONTINUE")
    : uiConfig.options;
  const hasOptions = filteredOptions.length > 0;

  // ============================================================================
  // BETA CONTINUE branch (SOFT_BETA_STRICT)
  // UX Contract: UX_CONTRACT_PAYWALL_SOFT_BETA_STRICT.md
  // ============================================================================
  if (uiConfig.isBetaContinue) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="heading-h3">
              {betaState === 'error' ? BETA_PAYWALL_COPY.errorTitle : uiConfig.title}
            </DialogTitle>
            <DialogDescription className="text-body-small">
              {betaState === 'error' ? BETA_PAYWALL_COPY.errorMessage : uiConfig.message}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            {/* PENDING state: spinner during auto-grant + resubmit */}
            {betaState === 'pending' && (
              <div className="flex flex-col items-center justify-center p-6 bg-blue-50 rounded-lg">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                <p className="text-sm font-medium text-blue-900">Сохранение…</p>
              </div>
            )}

            {/* ERROR state: loop protection (SSOT_UI_STATES §4) */}
            {betaState === 'error' && (
              <div className="flex flex-col items-center justify-center p-6 bg-red-50 rounded-lg">
                <AlertTriangle className="w-8 h-8 text-red-600 mb-3" />
                <p className="text-sm font-medium text-red-900">{BETA_PAYWALL_COPY.errorTitle}</p>
              </div>
            )}
          </DialogBody>

          <DialogFooter>
            {betaState === 'idle' && (
              <>
                <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                  {BETA_PAYWALL_COPY.cancelLabel}
                </Button>
                <Button
                  onClick={handleBetaContinue}
                  className="w-full sm:w-auto"
                >
                  {uiConfig.primaryCta.label}
                </Button>
              </>
            )}
            {betaState === 'pending' && (
              <Button disabled className="w-full sm:w-auto">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {uiConfig.primaryCta.label}
              </Button>
            )}
            {betaState === 'error' && (
              <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                {BETA_PAYWALL_COPY.cancelLabel}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ============================================================================
  // STANDARD paywall (HARD mode)
  // ============================================================================
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="heading-h3">{uiConfig.title}</DialogTitle>
          <DialogDescription className="text-body-small">{uiConfig.message}</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* Current plan info - using normalized meta from uiConfig */}
          {(uiConfig.meta.currentPlanLabel || uiConfig.meta.requiredPlanLabel || uiConfig.meta.limit) && (
            <div className="space-y-2 text-sm">
              {uiConfig.meta.currentPlanLabel && (
                <p>
                  <strong>Текущий план:</strong>{" "}
                  <span>{uiConfig.meta.currentPlanLabel}</span>
                </p>
              )}
              
              {uiConfig.meta.requiredPlanLabel && (
                <p>
                  <strong>Требуется:</strong>{" "}
                  <span>{uiConfig.meta.requiredPlanLabel}</span> или выше
                </p>
              )}

              {uiConfig.meta.limit !== undefined && uiConfig.meta.requested !== undefined && (
                <p className="text-muted-foreground">
                  Запрошено: {uiConfig.meta.requested} / Лимит: {uiConfig.meta.limit}
                </p>
              )}
            </div>
          )}

          {hasOptions ? (
            // Multiple payment options with status
            <>
              {paymentStatus === 'idle' && (
                <>
                  <p className="text-sm font-medium text-gray-700">Выберите удобный вариант:</p>
                  <div className="space-y-3">
                    {filteredOptions.filter(o => o.type !== 'BETA_CONTINUE').map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleOptionClick(option)}
                        disabled={isLoading}
                        className="w-full flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors text-left disabled:opacity-50"
                      >
                        {option.type === "ONE_OFF_CREDIT" ? (
                          <>
                            <CreditCard className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">Разовая оплата</p>
                              <p className="text-sm text-gray-600 mt-1">
                                {option.price} {option.currencyCode === 'KZT' ? '₸' : option.currencyCode} — Публикация одного события (до 500 участников)
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <Users className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">Подписка клуба</p>
                              <p className="text-sm text-gray-600 mt-1">
                                Неограниченное количество событий в рамках подписки клуба
                              </p>
                            </div>
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {paymentStatus === 'pending' && (
                <div className="flex flex-col items-center justify-center p-6 bg-blue-50 rounded-lg">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                  <p className="text-sm font-medium text-blue-900">Ожидаем подтверждение оплаты…</p>
                  <p className="text-xs text-blue-700 mt-1">Пожалуйста, завершите оплату в Kaspi.</p>
                </div>
              )}

              {paymentStatus === 'success' && (
                <div className="flex flex-col items-center justify-center p-6 bg-green-50 rounded-lg">
                  <CheckCircle2 className="w-8 h-8 text-green-600 mb-3" />
                  <p className="text-sm font-medium text-green-900">Оплата прошла успешно.</p>
                  <p className="text-xs text-green-700 mt-1">Обновляем данные…</p>
                </div>
              )}

              {paymentStatus === 'failed' && (
                <div className="flex flex-col items-center justify-center p-6 bg-red-50 rounded-lg">
                  <XCircle className="w-8 h-8 text-red-600 mb-3" />
                  <p className="text-sm font-medium text-red-900">Не удалось выполнить оплату.</p>
                  <p className="text-xs text-red-700 mt-1">Пожалуйста, попробуйте ещё раз.</p>
                </div>
              )}
            </>
          ) : null}
        </DialogBody>

        <DialogFooter>
          {hasOptions ? (
            <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">
              Отмена
            </Button>
          ) : (
            // Fallback: Single CTA button using uiConfig
            <>
              <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                Отмена
              </Button>
              <Button onClick={handleFallbackUpgrade} className="w-full sm:w-auto">
                {uiConfig.primaryCta.label}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Options for usePaywall hook
 */
interface UsePaywallOptions {
  /**
   * Callback when paywall is closed without completing payment (implicit abort).
   * SSOT_ARCHITECTURE §15: Implicit abort must reset pending/disabled UI state.
   */
  onAbort?: () => void;
}

/**
 * Hook to handle API errors and show paywall modal
 * 
 * Usage:
 * ```tsx
 * const { showPaywall, PaywallModalComponent } = usePaywall({
 *   onAbort: () => controller.reset(), // Reset pending state on implicit abort
 * });
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
export function usePaywall(options: UsePaywallOptions = {}) {
  const { onAbort } = options;
  const [paywallError, setPaywallError] = React.useState<PaywallErrorType | null>(null);

  const showPaywall = (error: PaywallErrorType) => {
    setPaywallError(error);
  };

  const hidePaywall = React.useCallback(() => {
    setPaywallError(null);
    // SSOT_ARCHITECTURE §15: Implicit abort (paywall close without completion)
    // must reset pending/disabled UI state
    onAbort?.();
  }, [onAbort]);

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
