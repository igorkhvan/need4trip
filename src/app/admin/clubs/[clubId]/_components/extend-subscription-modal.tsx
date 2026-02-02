/**
 * Extend Subscription Modal
 * 
 * Modal for extending club subscription expiration.
 * 
 * SYSTEM CONTRACT (ADMIN_UI_CONTRACT v1.0 §3.2):
 * - Required Inputs: days (integer > 0), reason (non-empty)
 * - UI Rules:
 *   - explicit CTA
 *   - confirmation step required
 *   - submit disabled while loading
 *   - explicit success or error state
 * - Forbidden UI Patterns:
 *   - editing plan/state
 *   - implying activation or renewal
 *   - auto-extension
 * - Copy Guardrails:
 *   - Allowed: "Extend subscription by N days"
 *   - Forbidden: "Activate", "Renew", "Upgrade"
 * 
 * @see docs/ui-contracts/system/ADMIN_UI_CONTRACT v1.0.md §3.2
 */

"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { extendSubscription } from "../../../_components/admin-api";
import { formatDateTime } from "@/lib/utils/dates";

type ModalState = "form" | "confirm" | "submitting" | "success" | "error";

interface ExtendSubscriptionModalProps {
  clubId: string;
  clubName: string;
  currentExpiresAt: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ExtendSubscriptionModal({
  clubId,
  clubName,
  currentExpiresAt,
  open,
  onOpenChange,
  onSuccess,
}: ExtendSubscriptionModalProps) {
  const [state, setState] = useState<ModalState>("form");
  const [days, setDays] = useState("30");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resultData, setResultData] = useState<{
    previousExpiresAt: string;
    newExpiresAt: string;
  } | null>(null);
  
  /**
   * Reset form when modal closes
   */
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state on close
      setState("form");
      setDays("30");
      setReason("");
      setError(null);
      setResultData(null);
    }
    onOpenChange(newOpen);
  };
  
  /**
   * Validate and move to confirmation step
   * SYSTEM CONTRACT: Confirmation step required
   */
  const handleProceedToConfirm = () => {
    // Validate days
    const daysNum = parseInt(days, 10);
    if (isNaN(daysNum) || daysNum <= 0) {
      setError("Укажите количество дней (положительное число)");
      return;
    }
    
    // Validate reason
    if (!reason.trim()) {
      setError("Укажите причину продления");
      return;
    }
    
    setError(null);
    setState("confirm");
  };
  
  /**
   * Execute extend subscription action
   * SYSTEM CONTRACT: submit disabled while loading
   */
  const handleSubmit = async () => {
    setState("submitting");
    setError(null);
    
    const daysNum = parseInt(days, 10);
    const result = await extendSubscription(clubId, daysNum, reason.trim());
    
    if (result.success) {
      setResultData({
        previousExpiresAt: result.data.previousExpiresAt,
        newExpiresAt: result.data.newExpiresAt,
      });
      setState("success");
      // Call onSuccess after short delay to show success state
      setTimeout(() => {
        onSuccess();
      }, 500);
    } else {
      setError(result.error.message);
      setState("error");
    }
  };
  
  /**
   * Go back to form from confirmation
   */
  const handleBack = () => {
    setState("form");
  };
  
  /**
   * Calculate new expiration date for preview
   */
  const getPreviewDate = (): string => {
    if (!currentExpiresAt) return "—";
    const daysNum = parseInt(days, 10);
    if (isNaN(daysNum) || daysNum <= 0) return "—";
    
    const date = new Date(currentExpiresAt);
    date.setDate(date.getDate() + daysNum);
    return formatDateTime(date.toISOString());
  };
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {/* COPY GUARDRAIL: "Extend subscription by N days" allowed */}
            {/* COPY GUARDRAIL: "Activate", "Renew", "Upgrade" FORBIDDEN */}
            Продлить подписку
          </DialogTitle>
          <DialogDescription>
            {clubName}
          </DialogDescription>
        </DialogHeader>
        
        <DialogBody className="space-y-4">
          {/* Form State */}
          {state === "form" && (
            <>
              {/* Current Expiration */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Текущее окончание</p>
                <p className="text-sm font-medium text-gray-900">
                  {currentExpiresAt ? formatDateTime(currentExpiresAt) : "—"}
                </p>
              </div>
              
              {/* Days Input */}
              {/* SYSTEM CONTRACT: days (integer > 0) required */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Количество дней <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  placeholder="30"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Новое окончание: {getPreviewDate()}
                </p>
              </div>
              
              {/* Reason Input */}
              {/* SYSTEM CONTRACT: reason (non-empty) required */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Причина <span className="text-red-500">*</span>
                </label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Укажите причину продления..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Причина будет записана в журнал действий
                </p>
              </div>
              
              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
            </>
          )}
          
          {/* Confirmation State */}
          {/* SYSTEM CONTRACT: confirmation step required */}
          {state === "confirm" && (
            <div className="text-center py-4">
              <p className="text-gray-900 font-medium">
                Подтвердите продление подписки
              </p>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Клуб:</dt>
                    <dd className="font-medium text-gray-900">{clubName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Продление на:</dt>
                    <dd className="font-medium text-gray-900">{days} дней</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Новое окончание:</dt>
                    <dd className="font-medium text-gray-900">{getPreviewDate()}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Причина:</dt>
                    <dd className="font-medium text-gray-900 mt-1">{reason}</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
          
          {/* Submitting State */}
          {state === "submitting" && (
            <div className="flex flex-col items-center py-8">
              <Spinner className="h-8 w-8" />
              <p className="text-gray-500 mt-4">Продление подписки...</p>
            </div>
          )}
          
          {/* Success State */}
          {/* SYSTEM CONTRACT: explicit success state */}
          {state === "success" && resultData && (
            <div className="flex flex-col items-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-gray-900 font-medium mt-4">Подписка успешно продлена</p>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm w-full">
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Было:</dt>
                    <dd className="text-gray-900">{formatDateTime(resultData.previousExpiresAt)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Стало:</dt>
                    <dd className="font-medium text-gray-900">{formatDateTime(resultData.newExpiresAt)}</dd>
                  </div>
                </dl>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Действие записано в журнал
              </p>
            </div>
          )}
          
          {/* Error State */}
          {/* SYSTEM CONTRACT: explicit error state */}
          {state === "error" && (
            <div className="flex flex-col items-center py-8">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <p className="text-gray-900 font-medium mt-4">Не удалось продлить подписку</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          )}
        </DialogBody>
        
        <DialogFooter>
          {state === "form" && (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Отмена
              </Button>
              <Button onClick={handleProceedToConfirm}>
                Продолжить
              </Button>
            </>
          )}
          
          {state === "confirm" && (
            <>
              <Button variant="outline" onClick={handleBack}>
                Назад
              </Button>
              {/* SYSTEM CONTRACT: explicit CTA button */}
              <Button onClick={handleSubmit}>
                Подтвердить
              </Button>
            </>
          )}
          
          {state === "success" && (
            <Button onClick={() => handleOpenChange(false)}>
              Закрыть
            </Button>
          )}
          
          {state === "error" && (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Закрыть
              </Button>
              <Button onClick={() => setState("form")}>
                Попробовать снова
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
