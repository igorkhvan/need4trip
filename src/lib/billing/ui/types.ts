/**
 * Canonical Client-Side Billing Error Types
 * 
 * SSOT: SSOT_API.md §5.2, §6.2
 * Contract: PHASE_B3-2_PAYWALL_ERROR_CONTRACT_ANALYSIS.md
 * 
 * These types match the server-side PaywallError and CreditConfirmationRequiredError
 * but are safe for client-side use (no class instance checking, pure interfaces).
 */

// Re-export stable enums from billing.ts (client-safe)
export type {
  PaywallReason,
  PaywallOptionType,
  PaywallOption,
  PaywallOptionOneOff,
  PaywallOptionClub,
  CreditConfirmationReason,
  PlanId,
  CreditCode,
} from "@/lib/types/billing";

// ============================================================================
// Paywall Details (402)
// ============================================================================

/**
 * PaywallDetails — normalized client-side representation of 402 PAYWALL error.details
 * 
 * Matches SSOT_API.md §5.2 contract.
 * 
 * IMPORTANT: `options[]` may be missing in legacy enforcement paths (GAP-1 in B3-2).
 * Frontend MUST implement fallback behavior per B3-3 matrix.
 */
export interface PaywallDetails {
  /** Machine-readable discriminator for UX branching */
  reason: string;
  
  /** Current plan state (null for personal context) */
  currentPlanId?: string | null;
  
  /** Target plan if upgrade is the only option (optional per B3-2 GAP-2) */
  requiredPlanId?: string;
  
  /** Context-specific data (shape varies per reason code - B3-2 GAP-3) */
  meta?: Record<string, unknown>;
  
  /** 
   * Upgrade paths (REQUIRED per SSOT but missing in legacy - B3-2 GAP-1).
   * When missing, use fallback behavior per B3-3 matrix.
   */
  options?: PaywallOptionParsed[];
  
  /**
   * Legacy CTA fallback (DEPRECATED: use options[] instead).
   * Present when options[] is missing.
   */
  cta?: {
    type: "OPEN_PRICING";
    href: string;
  };
  
  /**
   * Context for club-specific pricing navigation.
   * May be inferred from request context if not in payload (B3-2 GAP-6).
   */
  context?: {
    clubId?: string;
    userId?: string;
  };
}

/**
 * Parsed PaywallOption — unified shape for options[]
 * Handles both ONE_OFF_CREDIT and CLUB_ACCESS option types.
 */
export interface PaywallOptionParsed {
  type: "ONE_OFF_CREDIT" | "CLUB_ACCESS" | "BETA_CONTINUE";
  
  // ONE_OFF_CREDIT fields
  productCode?: string;
  price?: number;
  currencyCode?: string;
  provider?: string;
  
  // CLUB_ACCESS fields (note: B3-2 GAP-4 - key name may vary)
  recommendedPlanId?: string;
  requiredPlanId?: string;  // Legacy key name from some endpoints
}

// ============================================================================
// Credit Confirmation Details (409)
// ============================================================================

/**
 * CreditConfirmationDetails — normalized client-side representation of 409 error
 * 
 * Matches SSOT_API.md §6.2 CreditConfirmationRequiredError contract.
 */
export interface CreditConfirmationDetails {
  /** Must be "CREDIT_CONFIRMATION_REQUIRED" */
  code: "CREDIT_CONFIRMATION_REQUIRED";
  
  /** Reason for confirmation requirement */
  reason: string;  // e.g., "EVENT_UPGRADE_WILL_BE_CONSUMED"
  
  /** Context metadata */
  meta: {
    /** Credit code that will be consumed */
    creditCode: string;
    
    /** Event ID (null for create, string for update) */
    eventId: string | null;
    
    /** Number of participants requested */
    requestedParticipants: number;
  };
  
  /** CTA instruction */
  cta: {
    type: "CONFIRM_CONSUME_CREDIT";
    href?: string;
  };
}

// ============================================================================
// API Error Response Structure
// ============================================================================

/**
 * Parsed API error response structure.
 * Used by type guards to validate error shape.
 */
export interface ParsedApiError {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode?: number;
    details?: unknown;
  };
}

/**
 * UI Pattern for rendering billing errors.
 * Per B3-3 matrix, most errors use modal, some use inline.
 */
export type BillingUiPattern = "modal" | "inline";

/**
 * Result of handleApiError() call.
 */
export interface HandleApiErrorResult {
  /** True if error was handled by billing UI (modal shown) */
  handled: boolean;
  
  /** Type of handling if handled=true */
  kind?: "paywall" | "credit_confirmation";
}

/**
 * Options for handleApiError() function.
 */
export interface HandleApiErrorOptions {
  /**
   * Club ID for context-aware pricing navigation.
   * Used when payload doesn't include context.clubId.
   */
  clubId?: string;
  
  /**
   * Callback when user confirms credit consumption.
   * If not provided and 409 is received, will throw dev error.
   */
  onConfirmCredit?: (details: CreditConfirmationDetails) => Promise<void>;
  
  /**
   * Callback for beta continuation (SOFT_BETA_STRICT mode).
   * Called by PaywallModal after system auto-grant succeeds.
   * Resubmits the same action with confirm_credit=true.
   *
   * UX Contract: UX_CONTRACT_PAYWALL_SOFT_BETA_STRICT.md §7.1
   */
  onBetaContinue?: () => Promise<void>;
  
  /**
   * Fallback handler for errors not handled by billing UI.
   * Called for 401/403/404/422/500 etc.
   */
  onFallback?: (error: unknown) => void;
}
