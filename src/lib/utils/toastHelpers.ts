/**
 * Toast Helpers - Упрощенные helpers для toast уведомлений
 * 
 * Предоставляет удобные функции для частых случаев использования toast.
 * Единая точка импорта для toast, TOAST констант и helper функций.
 * 
 * @module toastHelpers
 * 
 * @example
 * ```typescript
 * import { toast, showError, TOAST } from "@/lib/utils/toastHelpers";
 * 
 * // Простой toast
 * toast({ title: "Готово", description: "Сохранено" });
 * 
 * // С константой
 * toast(TOAST.participant.created);
 * 
 * // Ошибка с автоматическим извлечением сообщения
 * catch (err) {
 *   showError(err, "Не удалось сохранить");
 * }
 * ```
 */

import { toast } from "@/components/ui/use-toast";
import { getErrorMessage } from "./errors";

// Re-export для единой точки импорта
export { TOAST } from "./toastMessages";
export { toast };

/**
 * Показать toast с ошибкой
 * 
 * Автоматически извлекает сообщение из error объекта
 * 
 * @param error - Error объект или любое значение
 * @param fallback - Fallback сообщение если не удалось извлечь из error
 * 
 * @example
 * ```typescript
 * catch (err) {
 *   showError(err, "Не удалось удалить");
 * }
 * ```
 */
export function showError(error: unknown, fallback = "Произошла ошибка") {
  toast({
    title: "Ошибка",
    description: getErrorMessage(error, fallback)
  });
}

