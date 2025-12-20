/**
 * useSaveScroll Hook
 * 
 * Возвращает функцию для ручного сохранения текущего scroll position.
 * Используется ПЕРЕД router.refresh() или другими операциями,
 * которые могут сбросить scroll.
 * 
 * @example
 * ```tsx
 * function ParticipantForm() {
 *   const saveScroll = useSaveScroll();
 *   
 *   const handleSubmit = async () => {
 *     saveScroll(); // Сохранить ПЕРЕД refresh
 *     await submitData();
 *     router.refresh();
 *   };
 * }
 * ```
 */

"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";

export function useSaveScroll(key?: string) {
  const pathname = usePathname();

  return useCallback(() => {
    if (typeof window === "undefined" || !window.sessionStorage) {
      return;
    }

    const storageKey = `scroll-${key || pathname}`;
    sessionStorage.setItem(storageKey, window.scrollY.toString());
  }, [key, pathname]);
}
