export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(message: string, opts?: { statusCode?: number; code?: string; details?: unknown }) {
    super(message);
    this.name = "AppError";
    this.statusCode = opts?.statusCode ?? 400;
    this.code = opts?.code ?? "AppError";
    this.details = opts?.details;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { statusCode: 400, code: "ValidationError", details });
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { statusCode: 404, code: "NotFound", details });
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { statusCode: 409, code: "Conflict", details });
    this.name = "ConflictError";
  }
}

export class AuthError extends AppError {
  constructor(message: string, details?: unknown, statusCode: number = 401) {
    super(message, { statusCode, code: "AuthError", details });
    this.name = "AuthError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Login required", details?: unknown) {
    super(message, { statusCode: 401, code: "UNAUTHORIZED", details });
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Not allowed", details?: unknown) {
    super(message, { statusCode: 403, code: "FORBIDDEN", details });
    this.name = "ForbiddenError";
  }
}

/**
 * ClubArchivedError - thrown when attempting a forbidden operation on an archived club.
 * 
 * Per SSOT_CLUBS_DOMAIN.md §8.3:
 * - Archived clubs (archived_at IS NOT NULL) forbid all write operations except whitelist
 * - API returns 403 with code: "CLUB_ARCHIVED"
 * 
 * Whitelist (allowed when archived):
 * - Read club profile (read-only)
 * - View billing status
 * - Cancel subscription
 * - Unarchive (owner-only)
 * - Self-leave (natural leave)
 */
export class ClubArchivedError extends AppError {
  constructor(message: string = "Club is archived. This operation is not allowed.", details?: unknown) {
    super(message, { statusCode: 403, code: "CLUB_ARCHIVED", details });
    this.name = "ClubArchivedError";
  }
}

export class InternalError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { statusCode: 500, code: "InternalError", details });
    this.name = "InternalError";
  }
}

/**
 * PaywallError - специальная ошибка для ограничений биллинга
 * 
 * Возвращает 402 Payment Required с machine-readable payload.
 * Frontend должен показать PaywallModal с призывом к апгрейду.
 * 
 * Spec: docs/BILLING_AND_LIMITS.md
 * Updated: 2024-12-25 - Added support for multiple payment options
 */
export class PaywallError extends AppError {
  reason: string;
  currentPlanId?: string;
  requiredPlanId?: string;
  meta?: Record<string, unknown>;
  options?: Array<{
    type: "ONE_OFF_CREDIT" | "CLUB_ACCESS";
    [key: string]: unknown;
  }>;
  cta?: {
    type: "OPEN_PRICING";
    href: "/pricing";
  };

  constructor(params: {
    message: string;
    reason: string;
    currentPlanId?: string;
    requiredPlanId?: string;
    meta?: Record<string, unknown>;
    options?: Array<{
      type: "ONE_OFF_CREDIT" | "CLUB_ACCESS";
      [key: string]: unknown;
    }>;
  }) {
    super(params.message, { 
      statusCode: 402, 
      code: "PAYWALL",
      details: {
        reason: params.reason,
        currentPlanId: params.currentPlanId,
        requiredPlanId: params.requiredPlanId,
        meta: params.meta,
        options: params.options,
      }
    });
    this.name = "PaywallError";
    this.reason = params.reason;
    this.currentPlanId = params.currentPlanId;
    this.requiredPlanId = params.requiredPlanId;
    this.meta = params.meta;
    this.options = params.options;
    
    // Fallback CTA if no options provided
    if (!this.options) {
      this.cta = {
        type: "OPEN_PRICING",
        href: "/pricing",
      };
    }
  }

  /**
   * Serialize to API response format
   */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      reason: this.reason,
      currentPlanId: this.currentPlanId,
      requiredPlanId: this.requiredPlanId,
      meta: this.meta,
      options: this.options,
      cta: this.cta,
    };
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

export function isPaywallError(err: unknown): err is PaywallError {
  return err instanceof PaywallError;
}

export function isClubArchivedError(err: unknown): err is ClubArchivedError {
  return err instanceof ClubArchivedError;
}

/**
 * Check if error is a PostgreSQL unique constraint violation
 * 
 * Detects errors from:
 * - Raw Postgres: error.code === '23505'
 * - Wrapped errors: error.details.code === '23505' (InternalError wrapper)
 * - Error messages containing "unique" or "duplicate"
 * 
 * Used to handle duplicate registration attempts gracefully.
 * 
 * @example
 * ```typescript
 * try {
 *   await createParticipant(payload);
 * } catch (err) {
 *   if (isUniqueViolationError(err)) {
 *     throw new ConflictError('Already registered');
 *   }
 *   throw err;
 * }
 * ```
 */
export function isUniqueViolationError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  
  const error = err as any;
  
  // PostgreSQL error code for unique_violation (direct)
  if (error.code === '23505') return true;
  
  // Check nested details.code (when wrapped in InternalError)
  if (error.details?.code === '23505') return true;
  
  // Check error messages for unique/duplicate keywords
  const message = error.message?.toLowerCase() || '';
  const detailsMessage = error.details?.message?.toLowerCase() || '';
  
  return message.includes('unique') || 
         message.includes('duplicate') ||
         message.includes('already exists') ||
         detailsMessage.includes('unique') ||
         detailsMessage.includes('duplicate');
}
