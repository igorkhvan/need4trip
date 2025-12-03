"use client";

import * as React from "react";

export type ToastInput = {
  id?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
};

type ToasterToast = Required<Pick<ToastInput, "id">> &
  Omit<ToastInput, "id"> & {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  };

const listeners = new Set<(toast: ToasterToast) => void>();

export function toast(toast: ToastInput) {
  const id = toast.id ?? crypto.randomUUID();
  listeners.forEach((listener) => listener({ ...toast, id }));
  return id;
}

export function useToast() {
  const [toasts, setToasts] = React.useState<ToasterToast[]>([]);

  React.useEffect(() => {
    const listener = (toast: ToasterToast) => {
      setToasts((current) => [...current, toast]);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const dismiss = (id?: string) => {
    setToasts((current) =>
      current.filter((toast) => {
        if (id) return toast.id !== id;
        return false;
      })
    );
  };

  return {
    toasts,
    dismiss,
  };
}
