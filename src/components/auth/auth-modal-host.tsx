"use client";

import { AuthModal } from "@/components/auth/auth-modal";
import { useAuthModalContext } from "@/components/auth/auth-modal-provider";

export function AuthModalHost() {
  const { modalProps } = useAuthModalContext();

  return <AuthModal {...modalProps} />;
}

