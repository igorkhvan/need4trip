"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useAuthModalContext } from "@/components/auth/auth-modal-provider";

export interface ProtectedPageProps {
  children: ReactNode;
  isAuthenticated: boolean;
  reason?: "REQUIRED" | "PAYWALL" | "REGISTER_ONLY" | "OWNER_ONLY";
  title?: string;
  description?: string;
}

export function ProtectedPage({
  children,
  isAuthenticated,
  reason = "REQUIRED",
  title,
  description,
}: ProtectedPageProps) {
  const { openModal } = useAuthModalContext();

  useEffect(() => {
    if (!isAuthenticated) {
      // Open modal after a small delay to avoid hydration mismatch
      const timer = setTimeout(() => {
        openModal({ reason, title, description });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, openModal, reason, title, description]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF4EF]">
            <svg
              className="h-8 w-8 text-[#FF6F2C]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-[20px] font-semibold text-[#1F2937]">
            {title || "Требуется авторизация"}
          </h2>
          <p className="mb-6 text-[15px] text-[#6B7280]">
            {description || "Для доступа к этой странице необходимо войти через Telegram."}
          </p>
          <button
            onClick={() => openModal({ reason, title, description })}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#FF6F2C] px-5 text-[15px] font-medium text-white transition-colors hover:bg-[#E55A1A]"
          >
            Войти через Telegram
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

