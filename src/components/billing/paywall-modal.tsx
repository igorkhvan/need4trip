"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles } from "lucide-react";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  requiredPlanId?: string;
}

export function PaywallModal({
  isOpen,
  onClose,
  title = "Обновите тариф",
  message,
  requiredPlanId,
}: PaywallModalProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    onClose();
    router.push("/pricing");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary-bg)]">
            <Sparkles className="h-6 w-6 text-[var(--color-primary)]" />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center pt-2">
            {message}
          </DialogDescription>
          {requiredPlanId && (
            <p className="text-center text-sm text-[#6B7280] pt-2">
              Требуется тариф: <span className="font-semibold">{requiredPlanId}</span>
            </p>
          )}
        </DialogHeader>
        <DialogFooter className="sm:justify-center gap-2">
          <Button onClick={handleUpgrade} className="w-full sm:w-auto">
            <Sparkles className="mr-2 h-4 w-4" />
            Посмотреть тарифы
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">
            Отмена
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
