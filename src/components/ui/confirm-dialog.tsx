"use client";

import { ReactNode, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";

// Trigger-based mode (with trigger element)
interface TriggerModeProps {
  trigger: ReactNode;
  open?: never;
  onClose?: never;
}

// Controlled mode (without trigger, controlled externally)
interface ControlledModeProps {
  trigger?: never;
  open: boolean;
  onClose: () => void;
}

type ConfirmDialogProps = (TriggerModeProps | ControlledModeProps) & {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  destructive?: boolean;
  loading?: boolean;
};

export function ConfirmDialog({
  trigger,
  open: externalOpen,
  onClose,
  title,
  description,
  confirmText = "Продолжить",
  cancelText = "Отмена",
  onConfirm,
  destructive = false,
  loading = false,
}: ConfirmDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Use external state if provided (controlled mode), otherwise use internal state
  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      if (isControlled && onClose) {
        onClose();
      } else {
        setInternalOpen(false);
      }
    } else if (!isControlled) {
      setInternalOpen(true);
    }
  };

  const handleConfirm = async () => {
    await onConfirm();
    if (!isControlled) {
      setInternalOpen(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={destructive ? "bg-red-600 hover:bg-red-700" : ""}
          >
            {loading ? (
              <>
                <Spinner size="sm" className="mr-2" />
                {confirmText}
              </>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

