/**
 * useLogout Hook
 * 
 * Централизованная логика выхода из системы.
 * Обрабатывает API вызов, events, и опциональный redirect.
 * 
 * @example
 * ```tsx
 * const logout = useLogout({ 
 *   onBefore: () => setMenuOpen(false),
 *   redirect: "/"  // optional, defaults to "/"
 * });
 * 
 * await logout();
 * ```
 */

"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { dispatchAuthChanged } from "@/lib/events/auth-events";

export interface UseLogoutOptions {
  /**
   * Callback вызывается ПЕРЕД logout API запросом
   * Полезно для закрытия меню, показа loader'а и т.д.
   */
  onBefore?: () => void;
  
  /**
   * Callback вызывается ПОСЛЕ успешного logout
   * Полезно для дополнительной cleanup логики
   */
  onSuccess?: () => void;
  
  /**
   * URL для редиректа после logout
   * @default "/"
   */
  redirect?: string | false;  // false = no redirect
  
  /**
   * Использовать React.useTransition для редиректа
   * @default false
   */
  useTransition?: boolean;
}

export function useLogout(options: UseLogoutOptions = {}) {
  const router = useRouter();
  const { 
    onBefore, 
    onSuccess, 
    redirect = "/",
    useTransition = false 
  } = options;

  return useCallback(async () => {
    try {
      // Pre-logout callback (закрытие меню и т.д.)
      onBefore?.();
      
      // Call logout API
      await fetch("/api/auth/logout", { method: "POST" });
      
      // Dispatch auth change event
      dispatchAuthChanged();
      
      // Post-logout callback
      onSuccess?.();
      
      // Redirect if needed
      if (redirect) {
        if (useTransition) {
          // React 18 transition для плавности
          const { startTransition } = await import("react");
          startTransition(() => {
            router.push(redirect);
            router.refresh();
          });
        } else {
          router.push(redirect);
          router.refresh();
        }
      } else {
        // No redirect, but still refresh to update server components
        router.refresh();
      }
    } catch (err) {
      console.error("[useLogout] Failed:", err);
      // Не пробрасываем ошибку дальше, чтобы не ломать UX
      // Компонент может добавить свою error handling через try/catch
    }
  }, [router, onBefore, onSuccess, redirect, useTransition]);
}
