/**
 * Shared Suspend/Unsuspend User Button
 * 
 * Used in both /admin/users and /admin/abuse pages.
 * Single source of truth for user suspension UI logic.
 * 
 * Features:
 * - Confirm dialog before action
 * - Reason input (mandatory)
 * - Loading state
 * - Error handling
 * - Calls POST /api/admin/users/:userId/status via admin-api.ts
 */

"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react";
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
import { changeUserStatus } from "./admin-api";

type ModalState = "closed" | "form" | "confirm" | "submitting" | "success" | "error";

interface SuspendUserButtonProps {
  userId: string;
  currentStatus: 'active' | 'suspended';
  /** Compact mode for tables (smaller button) */
  compact?: boolean;
  /** Called after successful status change */
  onSuccess?: () => void;
}

export function SuspendUserButton({
  userId,
  currentStatus,
  compact = false,
  onSuccess,
}: SuspendUserButtonProps) {
  const [modalState, setModalState] = useState<ModalState>("closed");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isSuspending = currentStatus === 'active';
  const targetStatus = isSuspending ? 'suspended' : 'active';
  const actionLabel = isSuspending ? 'Приостановить' : 'Разблокировать';
  const actionLabelShort = isSuspending ? 'Suspend' : 'Unsuspend';

  const handleOpenModal = () => {
    setModalState("form");
    setReason("");
    setError(null);
  };

  const handleClose = () => {
    setModalState("closed");
    setReason("");
    setError(null);
  };

  const handleProceedToConfirm = () => {
    if (!reason.trim()) {
      setError("Укажите причину");
      return;
    }
    setError(null);
    setModalState("confirm");
  };

  const handleSubmit = async () => {
    setModalState("submitting");
    setError(null);

    const result = await changeUserStatus(userId, targetStatus, reason.trim());

    if (result.success) {
      setModalState("success");
      setTimeout(() => {
        handleClose();
        onSuccess?.();
      }, 600);
    } else {
      setError(result.error.message);
      setModalState("error");
    }
  };

  return (
    <>
      {/* Trigger Button */}
      {compact ? (
        <Button
          variant={isSuspending ? "outline" : "default"}
          size="sm"
          className={isSuspending
            ? "h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
            : "h-7 px-2 text-xs text-green-600 border-green-200 hover:bg-green-50"
          }
          onClick={handleOpenModal}
        >
          {actionLabelShort}
        </Button>
      ) : (
        <Button
          variant={isSuspending ? "outline" : "default"}
          size="sm"
          className={isSuspending
            ? "text-red-600 border-red-200 hover:bg-red-50"
            : "text-green-600 border-green-200 hover:bg-green-50"
          }
          onClick={handleOpenModal}
        >
          {isSuspending ? (
            <ShieldAlert className="h-4 w-4 mr-1.5" />
          ) : (
            <ShieldCheck className="h-4 w-4 mr-1.5" />
          )}
          {actionLabel}
        </Button>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={modalState !== "closed"} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isSuspending ? "Приостановить аккаунт" : "Разблокировать аккаунт"}
            </DialogTitle>
            <DialogDescription>
              User ID: {userId}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            {/* Form */}
            {modalState === "form" && (
              <>
                <div className={`p-3 rounded-lg text-sm ${
                  isSuspending
                    ? "bg-red-50 text-red-800 border border-red-200"
                    : "bg-green-50 text-green-800 border border-green-200"
                }`}>
                  {isSuspending
                    ? "Приостановленный пользователь не сможет выполнять действия (создавать события, вступать в клубы и т.д.). Публичные данные останутся доступны."
                    : "Аккаунт будет разблокирован. Пользователь сможет снова выполнять все действия."
                  }
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Причина <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Укажите причину..."
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Причина будет записана в журнал действий
                  </p>
                </div>
                {error && (
                  <div className="flex items-start gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}
              </>
            )}

            {/* Confirm */}
            {modalState === "confirm" && (
              <div className="text-center py-4">
                <p className="text-gray-900 font-medium">
                  Подтвердите действие
                </p>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left">
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Действие:</dt>
                      <dd className="font-medium text-gray-900">{actionLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Причина:</dt>
                      <dd className="font-medium text-gray-900 mt-1">{reason}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}

            {/* Submitting */}
            {modalState === "submitting" && (
              <div className="flex flex-col items-center py-8">
                <Spinner className="h-8 w-8" />
                <p className="text-gray-500 mt-4">Обработка...</p>
              </div>
            )}

            {/* Success */}
            {modalState === "success" && (
              <div className="flex flex-col items-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <p className="text-gray-900 font-medium mt-4">
                  {isSuspending ? "Аккаунт приостановлен" : "Аккаунт разблокирован"}
                </p>
              </div>
            )}

            {/* Error */}
            {modalState === "error" && (
              <div className="flex flex-col items-center py-8">
                <AlertCircle className="h-12 w-12 text-red-500" />
                <p className="text-gray-900 font-medium mt-4">Не удалось выполнить действие</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            )}
          </DialogBody>

          <DialogFooter>
            {modalState === "form" && (
              <>
                <Button variant="outline" onClick={handleClose}>
                  Отмена
                </Button>
                <Button onClick={handleProceedToConfirm}>
                  Продолжить
                </Button>
              </>
            )}

            {modalState === "confirm" && (
              <>
                <Button variant="outline" onClick={() => setModalState("form")}>
                  Назад
                </Button>
                <Button
                  onClick={handleSubmit}
                  className={isSuspending ? "bg-red-600 hover:bg-red-700" : ""}
                >
                  Подтвердить
                </Button>
              </>
            )}

            {modalState === "error" && (
              <>
                <Button variant="outline" onClick={handleClose}>
                  Закрыть
                </Button>
                <Button onClick={() => setModalState("form")}>
                  Попробовать снова
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Status Badge component for displaying user status
 */
export function UserStatusBadge({ status }: { status: 'active' | 'suspended' }) {
  if (status === 'suspended') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <ShieldAlert className="h-3 w-3" />
        Suspended
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      Active
    </span>
  );
}
