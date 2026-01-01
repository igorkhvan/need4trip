/**
 * Client-Side Error Handling Types & Utilities
 * 
 * Typed interface for parsing API responses and handling errors in client components.
 * Provides consistent error handling across all fetch calls.
 * 
 * SSOT: This module is the canonical source for client-side error handling.
 */

// ============================================================================
// API Response Types
// ============================================================================

/**
 * API Error Response Shape (matches server-side respondError)
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: unknown;
  };
}

/**
 * API Success Response Shape (matches server-side respondSuccess)
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================================
// Client Error Class
// ============================================================================

/**
 * Client-side error class for typed error handling
 * 
 * @example
 * ```typescript
 * try {
 *   const data = await parseApiResponse<User>(res);
 * } catch (err) {
 *   if (err instanceof ClientError) {
 *     if (err.statusCode === 402) {
 *       showPaywall(err.details);
 *     } else {
 *       showError(err.message);
 *     }
 *   }
 * }
 * ```
 */
export class ClientError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, code: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = 'ClientError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  /**
   * Check if error is authentication error (401)
   */
  isAuthError(): boolean {
    return this.statusCode === 401;
  }

  /**
   * Check if error is forbidden (403)
   */
  isForbiddenError(): boolean {
    return this.statusCode === 403;
  }

  /**
   * Check if error is paywall (402)
   */
  isPaywallError(): boolean {
    return this.statusCode === 402;
  }

  /**
   * Check if error is conflict (409)
   */
  isConflictError(): boolean {
    return this.statusCode === 409;
  }

  /**
   * Check if error is validation error (422)
   */
  isValidationError(): boolean {
    return this.statusCode === 422;
  }
}

// ============================================================================
// Response Parser
// ============================================================================

/**
 * Parse API response and throw ClientError on failure
 * 
 * @param res - Fetch Response object
 * @returns Parsed data (type-safe)
 * @throws {ClientError} When API returns error response
 * 
 * @example
 * ```typescript
 * const loadProfile = async () => {
 *   try {
 *     const res = await fetch('/api/profile');
 *     const data = await parseApiResponse<{ user: User }>(res);
 *     setUserData(data.user);
 *   } catch (err) {
 *     if (err instanceof ClientError) {
 *       setError(err.message);
 *       log.error('Failed to load profile', { code: err.code });
 *     }
 *   }
 * };
 * ```
 */
export async function parseApiResponse<T>(res: Response): Promise<T> {
  // Parse JSON body
  let json: ApiResponse<T>;
  try {
    json = await res.json();
  } catch (err) {
    // Failed to parse JSON (network error, malformed response, etc.)
    throw new ClientError(
      'Failed to parse response',
      'PARSE_ERROR',
      res.status || 500
    );
  }

  // Check if response indicates success
  if (json.success) {
    return json.data;
  }

  // API returned error response
  throw new ClientError(
    json.error.message || 'Unknown error',
    json.error.code || 'UNKNOWN_ERROR',
    json.error.statusCode || res.status || 500,
    json.error.details
  );
}

/**
 * Parse API response with custom error handler
 * Useful when you want to handle specific errors differently
 * 
 * @param res - Fetch Response object
 * @param onError - Custom error handler (return true to suppress throw)
 * @returns Parsed data or null if error was handled
 * 
 * @example
 * ```typescript
 * const data = await parseApiResponseWithHandler(res, (error) => {
 *   if (error.isPaywallError()) {
 *     showPaywall(error.details);
 *     return true; // Suppress throw
 *   }
 *   return false; // Re-throw
 * });
 * ```
 */
export async function parseApiResponseWithHandler<T>(
  res: Response,
  onError: (error: ClientError) => boolean
): Promise<T | null> {
  try {
    return await parseApiResponse<T>(res);
  } catch (err) {
    if (err instanceof ClientError) {
      const handled = onError(err);
      if (handled) {
        return null;
      }
    }
    throw err;
  }
}

// ============================================================================
// Error Message Helpers
// ============================================================================

/**
 * Get user-friendly error message from any error type
 * 
 * Handles multiple error formats:
 * - ClientError instances: error.message with statusCode fallback
 * - Error instances: error.message
 * - String errors: direct value
 * - API responses: error.error.message (middleware/route handlers)
 * - Wrapped errors: error.details.message, error.error.message
 * - Object messages: tries multiple paths to find readable message
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
  
  // Handle ClientError instances
  if (error instanceof ClientError) {
    if (error.message) {
      return error.message;
    }

    // Fallback messages based on status code
    switch (error.statusCode) {
      case 401:
        return 'Требуется авторизация';
      case 403:
        return 'Недостаточно прав';
      case 402:
        return 'Требуется обновление тарифа';
      case 404:
        return 'Ресурс не найден';
      case 409:
        return 'Конфликт данных';
      case 422:
        return 'Ошибка валидации';
      case 500:
        return 'Внутренняя ошибка сервера';
      default:
        return fallback;
    }
  }
  
  // Handle Error instances
  if (error instanceof Error) {
    return error.message || fallback;
  }
  
  // Handle object errors (API responses, wrapped errors)
  if (typeof error === 'object') {
    const err = error as Record<string, unknown>;
    
    // Priority 1: err.error.message (API response from middleware/routes)
    if (err.error && typeof err.error === 'object') {
      const errorObj = err.error as Record<string, unknown>;
      if (errorObj.message && typeof errorObj.message === 'string') {
        return errorObj.message;
      }
    }
    
    // Priority 2: err.message (direct message string)
    if (err.message && typeof err.message === 'string') {
      return err.message;
    }
    
    // Priority 3: err.details.message (wrapped errors like InternalError)
    if (err.details && typeof err.details === 'object') {
      const detailsObj = err.details as Record<string, unknown>;
      if (detailsObj.message && typeof detailsObj.message === 'string') {
        return detailsObj.message;
      }
    }
  }
  
  return fallback;
}

/**
 * Check if error is ClientError instance
 */
export function isClientError(error: unknown): error is ClientError {
  return error instanceof ClientError;
}

