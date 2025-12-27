/**
 * LoadingBar Component
 * 
 * Тонкая полоска загрузки для фонового обновления данных.
 * Используется когда данные уже показаны, но обновляются в фоне (stale-while-revalidate).
 * 
 * @example
 * ```tsx
 * <div className="relative">
 *   {refetching && <LoadingBar />}
 *   <Card>Content</Card>
 * </div>
 * ```
 */

"use client";

export interface LoadingBarProps {
  /**
   * Position относительно родителя
   * @default "top"
   */
  position?: "top" | "bottom";
  
  /**
   * Высота полоски в px
   * @default 2
   */
  height?: number;
  
  /**
   * CSS класс для кастомизации
   */
  className?: string;
}

export function LoadingBar({ 
  position = "top", 
  height = 2,
  className = "" 
}: LoadingBarProps) {
  const positionClass = position === "top" ? "top-0" : "bottom-0";
  
  return (
    <div 
      className={`absolute left-0 right-0 ${positionClass} overflow-hidden ${className}`}
      style={{ height: `${height}px` }}
      role="progressbar"
      aria-label="Обновление данных"
    >
      <div 
        className="h-full w-full bg-[var(--color-primary)] animate-pulse"
        style={{
          background: "linear-gradient(90deg, transparent, var(--color-primary), transparent)",
          animation: "loading-shimmer 1.5s ease-in-out infinite",
        }}
      />
      
      <style jsx>{`
        @keyframes loading-shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}

