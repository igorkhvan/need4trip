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

  // 402 Payment Required - PaywallError
  if (response.status === 402) {
    // Extract message, handle both string and object formats
    const message = typeof body?.message === 'string' 
      ? body.message 
      : "Эта функция доступна на платных тарифах";
    throw new Error(message);
  }
  
  // Общая ошибка
  throw new Error(
    body?.message || body?.error || `Ошибка сервера (${response.status})`
  );
}

/**
 * Безопасно извлечь сообщение об ошибке из неизвестного типа
 * 
 * Handles multiple error formats:
 * - Error instances: error.message
 * - String errors: direct value
 * - Objects with nested messages: error.details.message, error.error.message
 * - Wrapped errors: tries multiple paths to find readable message
 * 
 * @param error - Unknown error type to extract message from
 * @param fallback - Default message if extraction fails
 * @returns Human-readable error message
 */
export function getErrorMessage(error: unknown, fallback = "Произошла ошибка"): string {
  if (!error) return fallback;
  
  // Handle string errors
  if (typeof error === "string") {
    return error;
  }
  
  // Handle Error instances
  if (error instanceof Error) {
    return error.message;
  }
  
  // Handle object errors (API responses, wrapped errors)
  if (typeof error === 'object') {
    const err = error as any;
    
    // Try different paths to extract message
    if (err.message && typeof err.message === 'string') {
      return err.message;
    }
    
    // Check nested details.message (wrapped errors like InternalError)
    if (err.details?.message && typeof err.details.message === 'string') {
      return err.details.message;
    }
    
    // Check error.error.message (API response format)
    if (err.error?.message && typeof err.error.message === 'string') {
      return err.error.message;
    }
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

