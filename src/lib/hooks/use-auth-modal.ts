import { useState, useCallback } from "react";
import type { AuthModalReason } from "@/components/auth/auth-modal";

export type OpenAuthModalOptions = {
  reason?: AuthModalReason;
  title?: string;
  description?: string;
  afterLoginRedirectTo?: string;
  onSuccess?: () => void;
};

export type AuthModalState = {
  open: boolean;
  reason?: AuthModalReason;
  title?: string;
  description?: string;
  afterLoginRedirectTo?: string;
  onSuccess?: () => void;
};

export function useAuthModal() {
  const [state, setState] = useState<AuthModalState>({
    open: false,
  });

  const openModal = useCallback((opts?: OpenAuthModalOptions) => {
    setState({
      open: true,
      reason: opts?.reason,
      title: opts?.title,
      description: opts?.description,
      afterLoginRedirectTo: opts?.afterLoginRedirectTo,
      onSuccess: opts?.onSuccess,
    });
  }, []);

  const closeModal = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const modalProps = {
    open: state.open,
    onOpenChange: (open: boolean) => {
      if (!open) closeModal();
    },
    title: state.title,
    description: state.description,
    reason: state.reason,
    afterLoginRedirectTo: state.afterLoginRedirectTo,
    onSuccess: state.onSuccess,
  };

  return {
    open: state.open,
    openModal,
    closeModal,
    modalProps,
  };
}

