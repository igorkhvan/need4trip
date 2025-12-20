/**
 * useLogout Hook
 * 
 * Централизованная логика выхода из системы.
 * Обрабатывает API вызов, events, и опциональный redirect.
 * 
 * Автоматическое определение редиректа:
 * - Если текущая страница защищённая → редирект на "/"
 * - Если текущая страница публичная → остаться на текущей странице
 * 
 * @example
 * ```tsx
 * const logout = useLogout({ 
 *   onBefore: () => setMenuOpen(false),
 * });
 * 
 * await logout(); // Автоматически определит куда редиректить
 * ```
 * 
 * @example
 * ```tsx
 * // Явно указать редирект
 * const logout = useLogout({ redirect: "/pricing" });
 * ```
 */

"use client";

import { useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { dispatchAuthChanged } from "@/lib/events/auth-events";
import { getLogoutRedirect } from "@/lib/config/protected-routes";

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
   * 
   * Автоматическое определение (если не указан):
   * - Защищённая страница → редирект на "/"
   * - Публичная страница → остаться на текущей (false)
   * 
   * @default undefined (автоматическое определение)
   */
  redirect?: string | false;
  
  /**
   * Использовать React.useTransition для редиректа
   * @default false
   */
  useTransition?: boolean;
}

export function useLogout(options: UseLogoutOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { 
    onBefore, 
    onSuccess, 
    redirect = undefined, // Автоматическое определение
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
      
      // Определяем redirect: явно указанный ИЛИ автоматический
      const targetRedirect = redirect !== undefined 
        ? redirect 
        : getLogoutRedirect(pathname);
      
      // Redirect if needed
      if (targetRedirect) {
        if (useTransition) {
          // React 18 transition для плавности
          const { startTransition } = await import("react");
          startTransition(() => {
            router.push(targetRedirect);
            router.refresh();
          });
        } else {
          router.push(targetRedirect);
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
  }, [router, pathname, onBefore, onSuccess, redirect, useTransition]);
}
