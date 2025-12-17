/**
 * Custom error class for paywall restrictions
 * 
 * Thrown when a user attempts to access a feature that requires
 * a paid plan or higher subscription tier.
 * 
 * Usage:
 * ```typescript
 * throw new PaywallError("Custom fields require Pro plan", {
 *   feature: "custom_fields",
 *   requiredPlanId: "pro"
 * });
 * ```
 */

export interface PaywallErrorDetails {
  feature?: string;
  requiredPlanId?: string;
  message?: string;
}

export class PaywallError extends Error {
  /**
   * Marker property to identify paywall errors
   * Used to distinguish from other errors in catch blocks
   */
  public readonly isPaywall = true;

  /**
   * Additional context about the paywall restriction
   */
  public readonly details?: PaywallErrorDetails;

  constructor(message: string = "PAYWALL_SHOWN", details?: PaywallErrorDetails) {
    super(message);
    this.name = "PaywallError";
    this.details = details;

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PaywallError);
    }
  }

  /**
   * Type guard to check if an error is a PaywallError
   */
  static isPaywallError(error: unknown): error is PaywallError {
    return error instanceof PaywallError || 
           (error instanceof Error && 'isPaywall' in error && (error as any).isPaywall === true);
  }
}
