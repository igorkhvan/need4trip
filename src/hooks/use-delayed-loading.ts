/**
 * useDelayedLoading Hook
 * 
 * Показывает loading state только если загрузка длится дольше заданной задержки.
 * Это предотвращает "мигание" loading индикаторов при быстрых операциях.
 * 
 * @param isLoading - текущее состояние загрузки
 * @param delay - задержка в миллисекундах перед показом loading (default: 300ms)
 * @returns boolean - показывать ли loading индикатор
 * 
 * @example
 * ```tsx
 * const [isLoading, setIsLoading] = useState(false);
 * const showLoading = useDelayedLoading(isLoading, 300);
 * 
 * return showLoading ? <Spinner /> : <Content />;
 * ```
 */

import { useEffect, useState } from "react";

export function useDelayedLoading(isLoading: boolean, delay = 300): boolean {
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    // Если не загружаем - сразу скрываем
    if (!isLoading) {
      setShowLoading(false);
      return;
    }

    // Если загружаем - показываем после задержки
    const timer = setTimeout(() => {
      setShowLoading(true);
    }, delay);

    // Cleanup: отменяем таймер если isLoading изменился
    return () => {
      clearTimeout(timer);
    };
  }, [isLoading, delay]);

  return showLoading;
}
