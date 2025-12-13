"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthModalContext } from "@/components/auth/auth-modal-provider";
import type { AuthModalReason } from "@/components/auth/auth-modal";

export interface ProtectedActionOptions {
  reason?: AuthModalReason;
  title?: string;
  description?: string;
  redirectTo?: string;
  onSuccess?: () => void;
}

/**
 * Hook для защищенных действий
 * 
 * Проверяет авторизацию перед выполнением действия.
 * Если не авторизован - показывает модалку без смены route.
 * После логина - выполняет действие.
 * 
 * @example
 * const handleCreateEvent = useProtectedAction(
 *   () => router.push('/events/create'),
 *   { redirectTo: '/events/create', title: 'Создание события' }
 * );
 */
export function useProtectedAction(
  isAuthenticated: boolean
) {
  const router = useRouter();
  const { openModal } = useAuthModalContext();

  const execute = useCallback(
    (action: () => void, options?: ProtectedActionOptions) => {
      if (isAuthenticated) {
        // User is authenticated - execute action immediately
        action();
      } else {
        // User is not authenticated - show modal
        openModal({
          reason: options?.reason || "REQUIRED",
          title: options?.title,
          description: options?.description,
          afterLoginRedirectTo: options?.redirectTo,
          onSuccess: options?.onSuccess,
        });
      }
    },
    [isAuthenticated, openModal]
  );

  /**
   * Execute a navigation action (with redirect after login)
   */
  const navigateTo = useCallback(
    (path: string, options?: Omit<ProtectedActionOptions, 'redirectTo'>) => {
      execute(
        () => router.push(path),
        { ...options, redirectTo: path }
      );
    },
    [execute, router]
  );

  return { execute, navigateTo };
}

