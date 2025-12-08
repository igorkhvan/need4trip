/**
 * Утилиты для работы с датами
 * Централизованные функции форматирования дат согласно Figma Design System
 */

/**
 * Форматирует дату и время в формате "DD месяц YYYY в HH:MM"
 * @example "10 декабря 2025 в 14:30"
 */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Форматирует дату и время в коротком формате "DD месяц в HH:MM"
 * @example "10 дек в 14:30"
 */
export function formatDateTimeShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Форматирует только дату в формате "DD месяц YYYY"
 * @example "10 декабря 2025"
 */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * Форматирует только дату в коротком формате "DD месяц YYYY"
 * @example "10 дек 2025"
 */
export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Вычисляет количество дней до события
 * @returns Положительное число - событие в будущем, отрицательное - в прошлом
 * @example getDaysUntil("2025-12-15") → 7 (через 7 дней)
 * @example getDaysUntil("2025-12-01") → -7 (7 дней назад)
 */
export function getDaysUntil(dateTime: string): number {
  const eventDate = new Date(dateTime);
  const now = new Date();
  const diff = eventDate.getTime() - now.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Проверяет начался ли уже event
 */
export function isEventStarted(dateTime: string): boolean {
  return getDaysUntil(dateTime) < 0;
}

/**
 * Проверяет скоро ли начинается event (в течение 7 дней)
 */
export function isEventStartingSoon(dateTime: string): boolean {
  const days = getDaysUntil(dateTime);
  return days >= 0 && days <= 7;
}

