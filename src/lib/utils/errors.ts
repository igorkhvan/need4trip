/**
 * Утилиты для обработки ошибок API
 * Централизованная обработка HTTP ошибок и форматирование сообщений
 */

/**
 * Обработать ответ API и выбросить ошибку с понятным сообщением
 * @throws Error с человекочитаемым сообщением
 */
export async function handleApiError(response: Response): Promise<never> {
  const body = await response.json().catch(() => ({}));
  
  // Специфичные HTTP статусы
  if (response.status === 401 || response.status === 403) {
    throw new Error("Недостаточно прав / войдите через Telegram");
  }
  
  if (response.status === 404) {
    throw new Error("Ресурс не найден");
  }
  
  if (response.status === 409) {
    throw new Error(body?.message || "Конфликт данных");
  }
  
  if (response.status === 400) {
    throw new Error(body?.message || "Ошибка валидации");
  }
  
  // Общая ошибка
  throw new Error(
    body?.message || body?.error || `Ошибка сервера (${response.status})`
  );
}

/**
 * Безопасно извлечь сообщение об ошибке из неизвестного типа
 */
export function getErrorMessage(error: unknown, fallback = "Произошла ошибка"): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return fallback;
}

/**
 * Проверить успешность ответа API и выбросить ошибку если нет
 */
export async function ensureApiSuccess(response: Response): Promise<void> {
  if (!response.ok) {
    await handleApiError(response);
  }
}

