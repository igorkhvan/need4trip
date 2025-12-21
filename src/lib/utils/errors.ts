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
  
  // Rate Limiting (429)
  if (response.status === 429) {
    const message = body?.error?.message || body?.message || "Слишком много запросов. Попробуйте позже.";
    throw new Error(message);
  }
  
  // Auth errors (401, 403)
  if (response.status === 401 || response.status === 403) {
    const message = body?.error?.message || body?.message || "Недостаточно прав / войдите через Telegram";
    throw new Error(message);
  }
  
  // Not Found (404)
  if (response.status === 404) {
    const message = body?.error?.message || body?.message || "Ресурс не найден";
    throw new Error(message);
  }
  
  // Conflict (409)
  if (response.status === 409) {
    const message = body?.error?.message || body?.message || "Конфликт данных";
    throw new Error(message);
  }
  
  // Validation (400)
  if (response.status === 400) {
    const message = body?.error?.message || body?.message || "Ошибка валидации";
    throw new Error(message);
  }

  // Payment Required (402) - PaywallError
  if (response.status === 402) {
    const message = body?.error?.message || body?.message || "Эта функция доступна на платных тарифах";
    throw new Error(message);
  }
  
  // Общая ошибка - извлекаем из body.error.message или body.message
  const message = body?.error?.message || body?.message || `Ошибка сервера (${response.status})`;
  throw new Error(message);
}

/**
 * Безопасно извлечь сообщение об ошибке из неизвестного типа
 * 
 * Handles multiple error formats:
 * - Error instances: error.message
 * - String errors: direct value
 * - API responses: error.error.message (middleware/route handlers)
 * - Wrapped errors: error.details.message, error.error.message
 * - Object messages: tries multiple paths to find readable message
 * 
 * Priority order:
 * 1. error.error.message (middleware format like rate limiting)
 * 2. error.message (direct message or Error instance)
 * 3. error.details.message (wrapped errors)
 * 4. Fallback message
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
    
    // Priority 1: err.error.message (API response from middleware/routes)
    // This handles: {error: {code: "...", message: "..."}}
    if (err.error?.message && typeof err.error.message === 'string') {
      return err.error.message;
    }
    
    // Priority 2: err.message (direct message string)
    if (err.message && typeof err.message === 'string') {
      return err.message;
    }
    
    // Priority 3: err.details.message (wrapped errors like InternalError)
    if (err.details?.message && typeof err.details.message === 'string') {
      return err.details.message;
    }
    
    // Edge case: err.message is an object with message property
    if (err.message && typeof err.message === 'object' && err.message.message) {
      return String(err.message.message);
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

