/**
 * Date & Time Utilities
 * 
 * Централизованные утилиты для работы с датой и временем в datetime picker.
 * Все функции pure (без side effects), полная TypeScript типизация.
 */

/**
 * Парсит строку формата datetime-local в Date объект
 * @param value строка в формате "YYYY-MM-DDTHH:mm" или ISO string
 * @returns Date объект или null если невалидно
 * @example parseDateTime("2025-12-24T14:30") // Date(2025, 11, 24, 14, 30)
 */
export function parseDateTime(value: string | null | undefined): Date | null {
  if (!value || typeof value !== "string") return null;
  
  try {
    const date = new Date(value);
    
    // Проверяем что дата валидна
    if (isNaN(date.getTime())) return null;
    
    return date;
  } catch {
    return null;
  }
}

/**
 * Сериализует Date объект в строку формата datetime-local
 * @param date Date объект
 * @returns строка в формате "YYYY-MM-DDTHH:mm" или пустая строка
 * @example serializeDateTime(new Date(2025, 11, 24, 14, 30)) // "2025-12-24T14:30"
 */
export function serializeDateTime(date: Date | null | undefined): string {
  if (!date || !(date instanceof Date)) return "";
  
  try {
    // Проверяем что дата валидна
    if (isNaN(date.getTime())) return "";
    
    // Форматируем в YYYY-MM-DDTHH:mm
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return "";
  }
}

/**
 * Форматирует дату и время для отображения в триггере
 * @param date дата для форматирования
 * @returns строка в формате "DD MMM YYYY, HH:mm" (RU locale)
 * @example formatDateTime(new Date(2025, 11, 24, 14, 30)) // "24 дек 2025, 14:30"
 */
export function formatDateTime(date: Date | null | undefined): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return "";
  }
  
  try {
    // День и месяц
    const day = String(date.getDate()).padStart(2, "0");
    const monthShort = date.toLocaleDateString("ru-RU", { month: "short" });
    const year = date.getFullYear();
    
    // Время
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    
    return `${day} ${monthShort} ${year}, ${hours}:${minutes}`;
  } catch {
    return "";
  }
}

/**
 * Форматирует только дату
 * @param date дата для форматирования
 * @returns строка в формате "DD MMM YYYY"
 * @example formatDate(new Date(2025, 11, 24)) // "24 дек 2025"
 */
export function formatDate(date: Date | null | undefined): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return "";
  }
  
  try {
    const day = String(date.getDate()).padStart(2, "0");
    const monthShort = date.toLocaleDateString("ru-RU", { month: "short" });
    const year = date.getFullYear();
    
    return `${day} ${monthShort} ${year}`;
  } catch {
    return "";
  }
}

/**
 * Форматирует только время
 * @param date дата для форматирования
 * @returns строка в формате "HH:mm"
 * @example formatTime(new Date(2025, 11, 24, 14, 30)) // "14:30"
 */
export function formatTime(date: Date | null | undefined): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return "00:00";
  }
  
  try {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    
    return `${hours}:${minutes}`;
  } catch {
    return "00:00";
  }
}

/**
 * Округляет минуты даты до ближайшего шага
 * @param date исходная дата
 * @param step шаг округления в минутах (5, 10, 15, 30)
 * @returns новый Date объект с округленными минутами
 * @example roundMinutes(new Date(2025, 11, 24, 14, 33), 15) // 14:30
 */
export function roundMinutes(date: Date, step: number = 15): Date {
  const rounded = new Date(date);
  const minutes = rounded.getMinutes();
  const roundedMinutes = Math.round(minutes / step) * step;
  
  rounded.setMinutes(roundedMinutes);
  rounded.setSeconds(0);
  rounded.setMilliseconds(0);
  
  return rounded;
}

/**
 * Извлекает строку времени из Date объекта
 * @param date Date объект
 * @returns строка в формате "HH:mm"
 * @example extractTime(new Date(2025, 11, 24, 14, 30)) // "14:30"
 */
export function extractTime(date: Date | null | undefined): string {
  return formatTime(date);
}

/**
 * Комбинирует выбранную дату (из календаря) и время (из селектора)
 * @param date дата из календаря
 * @param timeString строка времени "HH:mm"
 * @returns новый Date объект с установленным временем
 * @example combineDateTime(new Date(2025, 11, 24), "14:30") // Date(2025, 11, 24, 14, 30)
 */
export function combineDateTime(date: Date, timeString: string): Date {
  const result = new Date(date);
  
  const [hoursStr, minutesStr] = timeString.split(":");
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  
  if (isNaN(hours) || isNaN(minutes)) return result;
  
  result.setHours(hours, minutes, 0, 0);
  
  return result;
}

/**
 * Генерирует массив временных слотов для выбора
 * @param step шаг в минутах (5, 10, 15, 30)
 * @returns массив объектов { value: "HH:mm", label: "HH:mm" }
 * @example generateTimeSlots(30) // [{ value: "00:00", label: "00:00" }, { value: "00:30", label: "00:30" }, ...]
 */
export function generateTimeSlots(step: number = 15): Array<{ value: string; label: string }> {
  const slots: Array<{ value: string; label: string }> = [];
  
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += step) {
      const hourStr = String(hour).padStart(2, "0");
      const minuteStr = String(minute).padStart(2, "0");
      const time = `${hourStr}:${minuteStr}`;
      
      slots.push({
        value: time,
        label: time,
      });
    }
  }
  
  return slots;
}

/**
 * Проверяет, что дата находится в диапазоне min/max
 * @param date дата для проверки
 * @param minDate минимальная дата (optional)
 * @param maxDate максимальная дата (optional)
 * @returns true если дата в диапазоне
 */
export function isDateInRange(
  date: Date | null,
  minDate?: Date | null,
  maxDate?: Date | null
): boolean {
  if (!date) return false;
  
  const dateTime = date.getTime();
  
  if (minDate) {
    if (dateTime < minDate.getTime()) return false;
  }
  
  if (maxDate) {
    if (dateTime > maxDate.getTime()) return false;
  }
  
  return true;
}

/**
 * Проверяет, что дата не в прошлом (с учетом допуска в минутах)
 * @param date дата для проверки
 * @param toleranceMinutes допуск в минутах (default: 5)
 * @returns true если дата в будущем или в пределах допуска
 */
export function isInFuture(date: Date | null, toleranceMinutes: number = 5): boolean {
  if (!date) return false;
  
  const now = new Date();
  const minAllowedDate = new Date(now.getTime() - toleranceMinutes * 60 * 1000);
  
  return date.getTime() >= minAllowedDate.getTime();
}

/**
 * Получает дату "сейчас" с округлением минут
 * @param step шаг округления
 * @returns Date объект с округленными минутами
 * @example getNowRounded(15) // если сейчас 14:33, вернёт 14:30
 */
export function getNowRounded(step: number = 15): Date {
  return roundMinutes(new Date(), step);
}

/**
 * Добавляет часы к дате
 * @param date исходная дата
 * @param hours количество часов для добавления
 * @returns новый Date объект
 * @example addHours(new Date(2025, 11, 24, 14, 30), 1) // Date(2025, 11, 24, 15, 30)
 */
export function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

