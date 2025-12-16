/**
 * DelayedSpinner Component
 * 
 * Spinner который появляется только после заданной задержки.
 * Предотвращает "мигание" при быстрых операциях.
 * 
 * @param delay - задержка перед показом spinner (default: 300ms)
 * @param size - размер spinner (sm/md/lg)
 * @param className - дополнительные CSS классы
 * 
 * @example
 * ```tsx
 * const [loading, setLoading] = useState(false);
 * 
 * return (
 *   <>
 *     <button onClick={() => setLoading(true)}>Загрузить</button>
 *     {loading && <DelayedSpinner delay={300} />}
 *   </>
 * );
 * ```
 */

"use client";

import { useEffect, useState } from "react";
import { Spinner } from "./spinner";
import type { SpinnerProps } from "./spinner";

interface DelayedSpinnerProps extends Omit<SpinnerProps, 'size'> {
  delay?: number;
  size?: "sm" | "md" | "lg";
  show?: boolean; // Для явного контроля видимости
}

export function DelayedSpinner({ 
  delay = 300, 
  size = "md",
  show = true,
  className,
  ...props 
}: DelayedSpinnerProps) {
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    if (!show) {
      setShowSpinner(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowSpinner(true);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [show, delay]);

  if (!showSpinner) {
    return null;
  }

  return <Spinner size={size} className={className} {...props} />;
}

/**
 * DelayedPageLoader - отложенный page loader
 */
export function DelayedPageLoader({ delay = 300 }: { delay?: number }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!show) {
    return <div className="min-h-[400px]" />;
  }

  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-base text-[#6B7280]">Загрузка...</p>
      </div>
    </div>
  );
}
