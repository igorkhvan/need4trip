/**
 * Grant Credit Modal
 * 
 * Modal for granting one-off credit to user.
 * 
 * SYSTEM CONTRACT (ADMIN_UI_CONTRACT v1.0 §3.1):
 * - Required Inputs: creditCode (non-empty), reason (non-empty)
 * - UI Rules:
 *   - explicit CTA (button)
 *   - confirmation step required
 *   - submit disabled while loading
 *   - explicit success or error state
 * - Forbidden UI Patterns:
 *   - auto-submit
 *   - optimistic update
 *   - auto-consumption hints
 *   - "fix billing" / "override" language
 * - Copy Guardrails:
 *   - Allowed: "Grant one-off credit"
 *   - Forbidden: "Fix access", "Override limits"
 * 
 * @see docs/ui-contracts/system/ADMIN_UI_CONTRACT v1.0.md §3.1
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
import { grantCredit } from "../../../_components/admin-api";
import { CREDIT_CODES } from "@/lib/types/billing";

type ModalState = "form" | "confirm" | "submitting" | "success" | "error";

interface GrantCreditModalProps {
  userId: string;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function GrantCreditModal({
  userId,
  userName,
  open,
  onOpenChange,
  onSuccess,
}: GrantCreditModalProps) {
  const [state, setState] = useState<ModalState>("form");
  const [creditCode, setCreditCode] = useState(CREDIT_CODES[0]);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  /**
   * Reset form when modal closes
   */
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state on close
      setState("form");
      setCreditCode(CREDIT_CODES[0]);
      setReason("");
      setError(null);
    }
    onOpenChange(newOpen);
  };
  
  /**
   * Validate and move to confirmation step
   * SYSTEM CONTRACT: Confirmation step required
   */
  const handleProceedToConfirm = () => {
    // Validate reason
    if (!reason.trim()) {
      setError("Укажите причину выдачи кредита");
      return;
    }
    
    setError(null);
    setState("confirm");
  };
  
  /**
   * Execute grant credit action
   * SYSTEM CONTRACT: submit disabled while loading
   */
  const handleSubmit = async () => {
    setState("submitting");
    setError(null);
    
    const result = await grantCredit(userId, creditCode, reason.trim());
    
    if (result.success) {
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
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {/* COPY GUARDRAIL: "Grant one-off credit" allowed */}
            Выдать одноразовый кредит
          </DialogTitle>
          <DialogDescription>
            {userName}
          </DialogDescription>
        </DialogHeader>
        
        <DialogBody className="space-y-4">
          {/* Form State */}
          {state === "form" && (
            <>
              {/* Credit Code Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Тип кредита
                </label>
                <select
                  value={creditCode}
                  onChange={(e) => setCreditCode(e.target.value as typeof creditCode)}
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-[var(--color-primary)] focus:outline-none"
                >
                  {CREDIT_CODES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
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
                  placeholder="Укажите причину выдачи кредита..."
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
                Подтвердите выдачу кредита
              </p>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Кредит:</dt>
                    <dd className="font-medium text-gray-900">{creditCode}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Пользователь:</dt>
                    <dd className="font-medium text-gray-900">{userName}</dd>
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
              <p className="text-gray-500 mt-4">Выдача кредита...</p>
            </div>
          )}
          
          {/* Success State */}
          {/* SYSTEM CONTRACT: explicit success state */}
          {state === "success" && (
            <div className="flex flex-col items-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-gray-900 font-medium mt-4">Кредит успешно выдан</p>
              <p className="text-sm text-gray-500 mt-1">
                Действие записано в журнал
              </p>
            </div>
          )}
          
          {/* Error State */}
          {/* SYSTEM CONTRACT: explicit error state */}
          {state === "error" && (
            <div className="flex flex-col items-center py-8">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <p className="text-gray-900 font-medium mt-4">Не удалось выдать кредит</p>
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
