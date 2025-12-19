"use client";

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

  // Removed auto-open useEffect - let user click button instead
  // This provides better UX as the placeholder is already clear

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary-bg)]">
            <svg
              className="h-8 w-8 text-[var(--color-primary)]"
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
          <h2 className="mb-2 text-xl font-semibold text-[var(--color-text)]">
            {title || "Требуется авторизация"}
          </h2>
          <p className="mb-6 text-base text-[var(--color-text-muted)]">
            {description || "Для доступа к этой странице необходимо войти через Telegram."}
          </p>
          <button
            onClick={() => openModal({ reason, title, description })}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--color-primary)] px-5 text-base font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            Войти через Telegram
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

