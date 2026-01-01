# ⚠️ LEGACY IMPLEMENTATION — NOT SSOT / NOT NORMATIVE

**Status:** Reference-Only (v4 — December 2024)  
**Warning:** This document contains historical implementation details that may differ from current production code.

---

## Purpose

This file archives the v4 PaywallModal and CreditConfirmationModal implementations that were previously included in `SSOT_BILLING_SYSTEM_ANALYSIS.md`.

**IMPORTANT:**
- ❌ This is NOT a source of truth for billing or UI decisions
- ❌ Do NOT use this file for architectural or billing decisions
- ✅ Reference only for understanding historical implementation
- ✅ Actual implementation lives in `src/components/billing/`

**For normative billing rules, see:** `docs/ssot/SSOT_BILLING_SYSTEM_ANALYSIS.md`

---

## PaywallModal.tsx (v4 — Purchase Intent + Polling)

**Original Status:** Updated 26 Dec 2024  
**Original File:** `src/components/billing/PaywallModal.tsx`

### Features (Historical)

- Multiple payment options (ONE_OFF + CLUB)
- Unified `/api/billing/purchase-intent` API
- Transaction status polling
- Visual feedback (loading states)
- Error handling

### Full Implementation (Historical Reference)

```typescript
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PaywallError } from "@/lib/types/billing";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  error: PaywallError; // 402 response payload
}

export function PaywallModal({ open, onClose, error }: PaywallModalProps) {
  const [loading, setLoading] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  
  // Handle purchase intent
  const handlePurchase = async (productCode: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/purchase-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_code: productCode })
      });
      
      if (!res.ok) throw new Error('Purchase failed');
      
      const data = await res.json();
      setTransactionId(data.data.transaction_id);
      setPaymentUrl(data.data.payment_details.invoice_url);
      
      // Start polling for status
      startPolling(data.data.transaction_id);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };
  
  // Poll transaction status
  const startPolling = (txId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/billing/transactions/status?transaction_id=${txId}`);
        const data = await res.json();
        
        if (data.data.status === 'completed') {
          clearInterval(interval);
          setLoading(false);
          onClose();
          window.location.reload(); // Refresh to show new credit
        }
        
        if (data.data.status === 'failed') {
          clearInterval(interval);
          setLoading(false);
          alert('Payment failed');
        }
      } catch (err) {
        console.error(err);
      }
    }, 3000); // Poll every 3 seconds
    
    // Cleanup after 5 minutes
    setTimeout(() => clearInterval(interval), 5 * 60 * 1000);
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {error.reason === 'PUBLISH_REQUIRES_PAYMENT' 
              ? 'Превышен лимит бесплатного плана'
              : 'Требуется обновление плана'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Current situation */}
          <div className="bg-amber-50 p-4 rounded-lg">
            <p className="text-sm text-amber-900">
              {error.message}
            </p>
            {error.meta && (
              <p className="text-xs text-amber-700 mt-2">
                Запрошено: {error.meta.requestedParticipants} участников
                {error.meta.freeLimit && ` / Лимит: ${error.meta.freeLimit}`}
              </p>
            )}
          </div>
          
          {/* Payment options */}
          {error.options && error.options.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Варианты оплаты:</h3>
              
              {error.options.map((option, idx) => (
                <div key={idx} className="border p-4 rounded-lg">
                  {option.type === 'ONE_OFF_CREDIT' && (
                    <>
                      <h4 className="font-semibold">Разовый кредит</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        Одноразовое событие до 500 участников
                      </p>
                      <p className="font-bold text-lg mb-3">
                        {option.price} {option.currency_code === 'KZT' ? '₸' : option.currency_code}
                      </p>
                      <Button
                        onClick={() => handlePurchase(option.product_code)}
                        disabled={loading}
                        className="w-full"
                      >
                        {loading ? 'Обработка...' : 'Купить'}
                      </Button>
                    </>
                  )}
                  
                  {option.type === 'CLUB_ACCESS' && (
                    <>
                      <h4 className="font-semibold">Клубный доступ</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        Неограниченные события + members
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => window.location.href = '/pricing'}
                        className="w-full"
                      >
                        Посмотреть тарифы
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Payment in progress */}
          {paymentUrl && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-900 mb-2">
                Платёж создан. Оплатите по ссылке:
              </p>
              <a 
                href={paymentUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                Открыть Kaspi
              </a>
              <p className="text-xs text-blue-700 mt-2">
                После оплаты страница обновится автоматически
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for easy usage
export function usePaywall() {
  const [paywallError, setPaywallError] = useState<PaywallError | null>(null);
  
  const showPaywall = (error: PaywallError) => setPaywallError(error);
  const hidePaywall = () => setPaywallError(null);
  
  const PaywallModalComponent = paywallError ? (
    <PaywallModal open={!!paywallError} onClose={hidePaywall} error={paywallError} />
  ) : null;
  
  return { showPaywall, hidePaywall, PaywallModalComponent };
}
```

### Usage Example (v5+ — Save-time Enforcement)

```typescript
import { usePaywall } from "@/components/billing/PaywallModal";

const { showPaywall, PaywallModalComponent } = usePaywall();

try {
  // v5+: enforcement happens at save-time (POST/PUT), no separate publish step
  await fetch('/api/events', { method: 'POST', body: JSON.stringify(payload) });
} catch (err) {
  if (err.response?.status === 402) {
    showPaywall(err.response.data.error.details);
  }
}

return <>{PaywallModalComponent}</>;
```

---

## CreditConfirmationModal.tsx (v4)

**Original File:** `src/components/billing/CreditConfirmationModal.tsx`

**Purpose:** Shown when 409 CREDIT_CONFIRMATION_REQUIRED is received.

### Full Implementation (Historical Reference)

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, CreditCard } from "lucide-react";
import type { CreditCode } from "@/lib/types/billing";

interface CreditConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creditCode: CreditCode;
  eventId: string;
  requestedParticipants: number;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CreditConfirmationModal({
  open,
  onOpenChange,
  creditCode,
  requestedParticipants,
  onConfirm,
  onCancel,
  isLoading = false,
}: CreditConfirmationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-full">
              <CreditCard className="w-5 h-5 text-orange-600" />
            </div>
            <DialogTitle>Подтвердите использование кредита</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning */}
          <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-900">
                Это действие нельзя отменить
              </p>
              <p className="text-amber-700 mt-1">
                После подтверждения кредит будет привязан к этому событию
                и станет недоступен для других событий.
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Кредит:</span>
              <span className="font-medium">{creditCode}</span>
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
            {isLoading ? 'Сохранение...' : 'Подтвердить и сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook for easy usage
export function useCreditConfirmation() {
  const [modalState, setModalState] = useState<{
    open: boolean;
    creditCode?: CreditCode;
    eventId?: string;
    requestedParticipants?: number;
  }>({ open: false });

  const showConfirmation = (data: {
    creditCode: CreditCode;
    eventId: string;
    requestedParticipants: number;
  }) => {
    setModalState({ open: true, ...data });
  };

  const hideConfirmation = () => {
    setModalState({ open: false });
  };

  return { modalState, showConfirmation, hideConfirmation };
}
```

### Usage Example

```typescript
import { useCreditConfirmation, CreditConfirmationModal } from "@/components/billing/CreditConfirmationModal";

const { showConfirmation, hideConfirmation, modalState } = useCreditConfirmation();
const [pendingEventId, setPendingEventId] = useState<string | null>(null);

// When 409 received
if (publishRes.status === 409) {
  const error409 = await publishRes.json();
  setPendingEventId(eventId);
  showConfirmation({
    creditCode: error409.error.meta.creditCode,
    eventId: error409.error.meta.eventId,
    requestedParticipants: error409.error.meta.requestedParticipants
  });
}

// Render modal
return (
  <>
    {modalState.open && modalState.creditCode && (
      <CreditConfirmationModal
        open={modalState.open}
        onOpenChange={hideConfirmation}
        creditCode={modalState.creditCode}
        eventId={modalState.eventId!}
        requestedParticipants={modalState.requestedParticipants!}
        onConfirm={async () => {
          hideConfirmation();
          // v5+: Retry save with confirm_credit=1
          await handleSave(pendingPayload, true); // ?confirm_credit=1
        }}
        onCancel={hideConfirmation}
      />
    )}
  </>
);
```

---

## Notes

- This implementation was part of v4 billing system (December 2024)
- v5+ moved enforcement to save-time (POST/PUT) instead of separate publish step
- Actual UI may have evolved since this was documented
- For current implementation, always check `src/components/billing/`

---

**Back to normative billing rules:** [`docs/ssot/SSOT_BILLING_SYSTEM_ANALYSIS.md`](../ssot/SSOT_BILLING_SYSTEM_ANALYSIS.md)

