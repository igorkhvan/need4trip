"use client";

import dynamic from "next/dynamic";
import { useAuthModalContext } from "@/components/auth/auth-modal-provider";

// Динамический импорт модального окна авторизации для code splitting
const AuthModal = dynamic(
  () => import("@/components/auth/auth-modal").then((mod) => ({ default: mod.AuthModal })),
  { ssr: false }
);

export function AuthModalHost() {
  const { modalProps } = useAuthModalContext();

  return <AuthModal {...modalProps} />;
}

