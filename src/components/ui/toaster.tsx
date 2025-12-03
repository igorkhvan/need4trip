"use client";
"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Toast } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Выставляем флаг после первого клиента, чтобы избежать расхождений SSR/CSR.
    setMounted(true);
  }, []);

  useEffect(() => {
    const timers = toasts.map((toast) => setTimeout(() => dismiss(toast.id), 3000));
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismiss]);

  if (!mounted || typeof document === "undefined") return null;

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id}>
          <div className="space-y-1">
            {toast.title && <div className="font-semibold">{toast.title}</div>}
            {toast.description && (
              <div className="text-sm text-muted-foreground">{toast.description}</div>
            )}
          </div>
        </Toast>
      ))}
    </div>,
    document.body
  );
}
