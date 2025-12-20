/**
 * ScrollRestorationProvider
 * 
 * Глобальный провайдер для управления scroll restoration.
 * Отключает автоматический scroll restoration браузера,
 * чтобы использовать нашу кастомную логику.
 * 
 * Должен быть добавлен в root layout.
 */

"use client";

import { useEffect } from "react";

export function ScrollRestorationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Отключаем автоматический scroll restoration браузера
    // Используем нашу кастомную логику через sessionStorage
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    // Cleanup: восстанавливаем дефолтное поведение при unmount
    return () => {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "auto";
      }
    };
  }, []);

  return <>{children}</>;
}
