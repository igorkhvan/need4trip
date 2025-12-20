/**
 * useScrollRestoration Hook
 * 
 * Автоматически сохраняет и восстанавливает scroll position при:
 * - Переходе на другую страницу и возврате назад
 * - router.refresh() вызовах
 * - Client-side навигации
 * 
 * Использует SessionStorage (очищается при закрытии вкладки)
 * 
 * @param key - Уникальный ключ для страницы (e.g., 'events-list', 'event-123')
 * 
 * @example
 * ```tsx
 * function EventsPage() {
 *   useScrollRestoration('events-list');
 *   return <div>...</div>;
 * }
 * ```
 */

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function useScrollRestoration(key?: string) {
  const pathname = usePathname();
  const storageKey = `scroll-${key || pathname}`;

  useEffect(() => {
    // Проверка доступности sessionStorage
    if (typeof window === "undefined" || !window.sessionStorage) {
      return;
    }

    // Восстановить scroll position при mount
    const savedScroll = sessionStorage.getItem(storageKey);
    if (savedScroll) {
      // Используем requestAnimationFrame для корректного timing после render
      requestAnimationFrame(() => {
        window.scrollTo({
          top: parseInt(savedScroll, 10),
          behavior: "instant" as ScrollBehavior,
        });
      });
    }

    // Сохранять scroll position при каждом scroll event
    let timeoutId: NodeJS.Timeout;
    const saveScroll = () => {
      // Debounce для производительности (сохраняем раз в 100ms)
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        sessionStorage.setItem(storageKey, window.scrollY.toString());
      }, 100);
    };

    window.addEventListener("scroll", saveScroll, { passive: true });

    // Cleanup
    return () => {
      window.removeEventListener("scroll", saveScroll);
      clearTimeout(timeoutId);
    };
  }, [storageKey]);
}
