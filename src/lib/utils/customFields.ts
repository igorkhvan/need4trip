import { EventCustomFieldType } from "@/lib/types/event";

/**
 * Утилиты для работы с custom полями событий
 */

/**
 * Получить значение по умолчанию для типа custom поля
 */
export function getDefaultCustomFieldValue(type: EventCustomFieldType): string | number | boolean {
  switch (type) {
    case "number":
      return 0;
    case "boolean":
      return false;
    case "text":
    case "enum":
    default:
      return "";
  }
}

/**
 * Форматировать значение custom поля для отображения в таблице
 */
export function formatCustomFieldValue(
  value: unknown,
  type: EventCustomFieldType
): string {
  // Для boolean полей: false - это валидное значение "Нет"
  if (type === "boolean") {
    if (value === null || value === undefined) return "—";
    return value ? "Да" : "Нет";
  }
  
  // Для остальных типов полей
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

/**
 * Форматировать роль участника для отображения
 */
export function formatParticipantRole(role: "leader" | "tail" | "participant"): string {
  switch (role) {
    case "leader":
      return "Лидер";
    case "tail":
      return "Замыкающий";
    case "participant":
      return "Участник";
    default:
      return "Участник";
  }
}

