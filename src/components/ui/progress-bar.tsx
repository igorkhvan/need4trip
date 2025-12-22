import { cn } from "@/lib/utils";

/**
 * Progress Bar компонент согласно Figma Design System
 * 
 * Цветовая схема заполненности:
 * - 0-59%: Зелёный (#22C55E) - Много мест
 * - 60-84%: Оранжевый (#FF6F2C) - Заполняется
 * - 85-100%: Красный (#EF4444) - Почти заполнено/Критично мало мест
 */

export interface ProgressBarProps {
  /** Процент заполненности (0-100) */
  value: number;
  /** Показывать ли процент и label сверху */
  showLabel?: boolean;
  /** Текст label (по умолчанию "Заполненность") */
  label?: string;
  /** Размер прогресс-бара */
  size?: "sm" | "md";
  /** Дополнительный класс для контейнера */
  className?: string;
}

/**
 * Получить цвет прогресс-бара в зависимости от заполненности
 */
function getProgressColor(value: number): string {
  if (value >= 85) return "bg-[var(--color-danger)]"; // Красный - почти заполнено
  if (value >= 60) return "bg-[var(--color-primary)]"; // Оранжевый - заполняется
  return "bg-[var(--color-success)]"; // Зелёный - много мест
}

/**
 * Progress Bar компонент
 */
export function ProgressBar({
  value,
  showLabel = true,
  label = "Заполненность",
  size = "md",
  className,
}: ProgressBarProps) {
  // Нормализуем значение в диапазон 0-100
  const normalizedValue = Math.min(Math.max(value, 0), 100);
  
  const barHeight = size === "sm" ? "h-1.5" : "h-2";

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium text-[var(--color-text)]">{Math.round(normalizedValue)}%</span>
        </div>
      )}
      <div className={cn("overflow-hidden rounded-full bg-[var(--color-bg-subtle)]", barHeight)}>
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            getProgressColor(normalizedValue)
          )}
          style={{ width: `${normalizedValue}%` }}
          role="progressbar"
          aria-valuenow={normalizedValue}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

/**
 * Вспомогательная функция для расчета процента заполненности события
 */
export function calculateEventFillPercentage(
  participantsCount: number,
  maxParticipants: number | null | undefined
): number {
  if (!maxParticipants || maxParticipants === 0) return 0;
  return Math.round((participantsCount / maxParticipants) * 100);
}

