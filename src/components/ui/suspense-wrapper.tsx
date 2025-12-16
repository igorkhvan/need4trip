/**
 * SuspenseWrapper Component
 * 
 * Обертка над React Suspense с отложенным показом fallback.
 * Предотвращает "мигание" loading состояний при быстрой загрузке.
 * 
 * @param fallback - компонент для показа во время загрузки
 * @param delay - задержка перед показом fallback (default: 300ms)
 * @param children - контент для lazy loading
 * 
 * @example
 * ```tsx
 * <SuspenseWrapper fallback={<Skeleton />} delay={300}>
 *   <LazyComponent />
 * </SuspenseWrapper>
 * ```
 */

"use client";

import { Suspense, useEffect, useState } from "react";

interface SuspenseWrapperProps {
  fallback?: React.ReactNode;
  delay?: number;
  children: React.ReactNode;
}

function DelayedFallback({ 
  fallback, 
  delay = 300 
}: { 
  fallback: React.ReactNode; 
  delay?: number;
}) {
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFallback(true);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [delay]);

  // Пока не прошла задержка - показываем пустой div
  return showFallback ? <>{fallback}</> : <div className="min-h-[1px]" />;
}

export function SuspenseWrapper({ 
  fallback = <div>Загрузка...</div>, 
  delay = 300,
  children 
}: SuspenseWrapperProps) {
  return (
    <Suspense fallback={<DelayedFallback fallback={fallback} delay={delay} />}>
      {children}
    </Suspense>
  );
}
