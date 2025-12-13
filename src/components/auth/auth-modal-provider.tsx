"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useAuthModal, type OpenAuthModalOptions } from "@/lib/hooks/use-auth-modal";
import type { AuthModalProps } from "@/components/auth/auth-modal";

type AuthModalContextValue = {
  openModal: (opts?: OpenAuthModalOptions) => void;
  closeModal: () => void;
  open: boolean;
  modalProps: AuthModalProps;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function useAuthModalContext() {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error("useAuthModalContext must be used within AuthModalProvider");
  }
  return context;
}

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const authModal = useAuthModal();

  return (
    <AuthModalContext.Provider value={authModal}>
      {children}
    </AuthModalContext.Provider>
  );
}

