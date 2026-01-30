/**
 * API Error Parsing & Type Guards (Client-Safe)
 * 
 * SSOT: SSOT_API.md §5.2, §6.2
 * Contract: PHASE_B3-2_PAYWALL_ERROR_CONTRACT_ANALYSIS.md
 * 
 * These utilities parse API responses and provide type-safe guards
 * for billing-related errors (402 PAYWALL, 409 CREDIT_CONFIRMATION).
 */

import type {
  PaywallDetails,
  CreditConfirmationDetails,
  ParsedApiError,
  PaywallOptionParsed,
} from "./types";

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is a parsed API error response.
 * 
 * Works with both:
 * - ClientError instances (from parseApiResponse)
 * - Raw JSON error responses
 */
export function isApiErrorResponse(value: unknown): value is ParsedApiError {
  if (!value || typeof value !== "object") return false;
  
  const obj = value as Record<string, unknown>;
  
  // Check for ParsedApiError shape
  if (obj.success === false && obj.error && typeof obj.error === "object") {
    const error = obj.error as Record<string, unknown>;
    return typeof error.code === "string";
  }
  
  return false;
}

/**
 * Check if error is a Paywall error (402 PAYWALL).
 * 
 * Works with:
 * - ClientError instances (statusCode === 402)
 * - Raw fetch responses (status === 402)
 * - Parsed JSON responses (error.code === "PAYWALL")
 * 
 * @example
 * ```typescript
 * try {
 *   const data = await parseApiResponse<T>(res);
 * } catch (err) {
 *   if (isPaywallApiError(err)) {
 *     const details = extractPaywallDetails(err);
 *     openPaywall(details);
 *   }
 * }
 * ```
 */
export function isPaywallApiError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  
  const obj = error as Record<string, unknown>;
  
  // Check ClientError-like shape (from parseApiResponse)
  if (obj.statusCode === 402) return true;
  if (obj.code === "PAYWALL") return true;
  
  // Check fetch Response-like shape
  if (obj.status === 402) return true;
  
  // Check parsed JSON response shape
  if (obj.error && typeof obj.error === "object") {
    const err = obj.error as Record<string, unknown>;
    if (err.code === "PAYWALL") return true;
    if (err.statusCode === 402) return true;
  }
  
  // Check nested details
  if (obj.details && typeof obj.details === "object") {
    const details = obj.details as Record<string, unknown>;
    if (details.code === "PAYWALL") return true;
  }
  
  return false;
}

/**
 * Check if error is a Credit Confirmation error (409 CREDIT_CONFIRMATION_REQUIRED).
 * 
 * @example
 * ```typescript
 * if (isCreditConfirmationApiError(err)) {
 *   const details = extractCreditConfirmationDetails(err);
 *   openCreditConfirmation(details, onConfirm);
 * }
 * ```
 */
export function isCreditConfirmationApiError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  
  const obj = error as Record<string, unknown>;
  
  // Check ClientError-like shape
  if (obj.statusCode === 409 && obj.code === "CREDIT_CONFIRMATION_REQUIRED") return true;
  if (obj.code === "CREDIT_CONFIRMATION_REQUIRED") return true;
  
  // Check parsed JSON response shape
  if (obj.error && typeof obj.error === "object") {
    const err = obj.error as Record<string, unknown>;
    if (err.code === "CREDIT_CONFIRMATION_REQUIRED") return true;
  }
  
  // Check nested details
  if (obj.details && typeof obj.details === "object") {
    const details = obj.details as Record<string, unknown>;
    if (details.code === "CREDIT_CONFIRMATION_REQUIRED") return true;
  }
  
  return false;
}

// ============================================================================
// Extraction Helpers
// ============================================================================

/**
 * Extract PaywallDetails from various error shapes.
 * 
 * Handles multiple formats:
 * - ClientError.details (from parseApiResponse)
 * - Raw JSON response.error.details
 * - Direct PaywallError shape
 * 
 * @returns PaywallDetails or null if extraction fails
 */
export function extractPaywallDetails(error: unknown): PaywallDetails | null {
  if (!error || typeof error !== "object") return null;
  
  const obj = error as Record<string, unknown>;
  
  // Try multiple paths to find paywall data
  let source: Record<string, unknown> | null = null;
  
  // Path 1: ClientError.details
  if (obj.details && typeof obj.details === "object") {
    const details = obj.details as Record<string, unknown>;
    if (details.reason && typeof details.reason === "string") {
      source = details;
    }
  }
  
  // Path 2: error.error.details (parsed JSON response)
  if (!source && obj.error && typeof obj.error === "object") {
    const err = obj.error as Record<string, unknown>;
    if (err.details && typeof err.details === "object") {
      const details = err.details as Record<string, unknown>;
      if (details.reason && typeof details.reason === "string") {
        source = details;
      }
    }
    // Also check if error itself has reason (direct PaywallError.toJSON())
    if (!source && err.reason && typeof err.reason === "string") {
      source = err;
    }
  }
  
  // Path 3: Direct shape (reason at root)
  if (!source && obj.reason && typeof obj.reason === "string") {
    source = obj;
  }
  
  if (!source) return null;
  
  // Parse options array
  let options: PaywallOptionParsed[] | undefined;
  if (Array.isArray(source.options)) {
    options = source.options.map(parsePaywallOption).filter(Boolean) as PaywallOptionParsed[];
    if (options.length === 0) options = undefined;
  }
  
  // Build normalized PaywallDetails
  return {
    reason: source.reason as string,
    currentPlanId: source.currentPlanId as string | null | undefined,
    requiredPlanId: source.requiredPlanId as string | undefined,
    meta: source.meta as Record<string, unknown> | undefined,
    options,
    cta: source.cta as PaywallDetails["cta"] | undefined,
    context: source.context as PaywallDetails["context"] | undefined,
  };
}

/**
 * Parse a single PaywallOption from raw data.
 */
function parsePaywallOption(raw: unknown): PaywallOptionParsed | null {
  if (!raw || typeof raw !== "object") return null;
  
  const obj = raw as Record<string, unknown>;
  const type = obj.type as string;
  
  if (type === "ONE_OFF_CREDIT") {
    return {
      type: "ONE_OFF_CREDIT",
      productCode: obj.productCode as string | undefined,
      price: obj.price as number | undefined,
      currencyCode: obj.currencyCode as string | undefined,
      provider: obj.provider as string | undefined,
    };
  }
  
  if (type === "CLUB_ACCESS") {
    return {
      type: "CLUB_ACCESS",
      // Handle both key names (B3-2 GAP-4)
      recommendedPlanId: (obj.recommendedPlanId ?? obj.requiredPlanId) as string | undefined,
      requiredPlanId: obj.requiredPlanId as string | undefined,
    };
  }
  
  return null;
}

/**
 * Extract CreditConfirmationDetails from various error shapes.
 * 
 * @returns CreditConfirmationDetails or null if extraction fails
 */
export function extractCreditConfirmationDetails(error: unknown): CreditConfirmationDetails | null {
  if (!error || typeof error !== "object") return null;
  
  const obj = error as Record<string, unknown>;
  
  // Try multiple paths to find credit confirmation data
  let source: Record<string, unknown> | null = null;
  
  // Path 1: ClientError.details
  if (obj.details && typeof obj.details === "object") {
    const details = obj.details as Record<string, unknown>;
    if (details.code === "CREDIT_CONFIRMATION_REQUIRED") {
      source = details;
    }
  }
  
  // Path 2: error.error.details
  if (!source && obj.error && typeof obj.error === "object") {
    const err = obj.error as Record<string, unknown>;
    if (err.details && typeof err.details === "object") {
      const details = err.details as Record<string, unknown>;
      if (details.code === "CREDIT_CONFIRMATION_REQUIRED") {
        source = details;
      }
    }
    // Also check if error itself is the payload
    if (!source && err.code === "CREDIT_CONFIRMATION_REQUIRED") {
      source = err;
    }
  }
  
  // Path 3: Direct shape
  if (!source && obj.code === "CREDIT_CONFIRMATION_REQUIRED") {
    source = obj;
  }
  
  if (!source) return null;
  
  // Validate and extract meta
  const meta = source.meta as Record<string, unknown> | undefined;
  if (!meta) return null;
  
  return {
    code: "CREDIT_CONFIRMATION_REQUIRED",
    reason: (source.reason as string) || "EVENT_UPGRADE_WILL_BE_CONSUMED",
    meta: {
      creditCode: (meta.creditCode as string) || "EVENT_UPGRADE_500",
      eventId: (meta.eventId as string | null) ?? null,
      requestedParticipants: (meta.requestedParticipants as number) || 0,
    },
    cta: (source.cta as CreditConfirmationDetails["cta"]) || {
      type: "CONFIRM_CONSUME_CREDIT",
    },
  };
}

/**
 * Parse any API error response from fetch JSON.
 * 
 * Safe to call with any JSON - returns null if not a valid API error.
 * 
 * @example
 * ```typescript
 * const res = await fetch('/api/events', { method: 'POST', body });
 * const json = await res.json();
 * 
 * const error = parseApiErrorResponse(json);
 * if (error && isPaywallApiError(error)) {
 *   handleApiError(error);
 * }
 * ```
 */
export function parseApiErrorResponse(json: unknown): ParsedApiError | null {
  if (!json || typeof json !== "object") return null;
  
  const obj = json as Record<string, unknown>;
  
  // Check canonical shape: { success: false, error: { code, message } }
  if (obj.success === false && obj.error && typeof obj.error === "object") {
    const error = obj.error as Record<string, unknown>;
    if (typeof error.code === "string" && typeof error.message === "string") {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          statusCode: error.statusCode as number | undefined,
          details: error.details,
        },
      };
    }
  }
  
  return null;
}

/**
 * Get HTTP status code from error object.
 * Works with ClientError, Response, or parsed JSON.
 */
export function getErrorStatusCode(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  
  const obj = error as Record<string, unknown>;
  
  // ClientError.statusCode
  if (typeof obj.statusCode === "number") return obj.statusCode;
  
  // Response.status
  if (typeof obj.status === "number") return obj.status;
  
  // Parsed JSON: error.statusCode
  if (obj.error && typeof obj.error === "object") {
    const err = obj.error as Record<string, unknown>;
    if (typeof err.statusCode === "number") return err.statusCode;
  }
  
  return null;
}
