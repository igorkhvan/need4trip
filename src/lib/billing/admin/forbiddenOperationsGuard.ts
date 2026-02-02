/**
 * Forbidden Admin Billing Operations Guard
 * 
 * Implements GAP-9: Guardrails against forbidden mutations.
 * 
 * @see SSOT_ADMIN_DOMAIN v1.0 §6 (Explicitly Forbidden Operations)
 * @see SSOT_BILLING_ADMIN_RULES v1.0 §6 (Forbidden Billing Operations)
 * @see SSOT_ADMIN_AUDIT_RULES v1.0 §2.3 (Failed Attempts)
 * 
 * RULES:
 * - Any attempt to perform forbidden operation MUST throw immediately
 * - Forbidden attempts are audited as rejected
 * - No partial execution is allowed
 * 
 * FORBIDDEN OPERATIONS (Exhaustive List):
 * 
 * Subscription Lifecycle (SSOT_ADMIN_DOMAIN §6.1):
 * - CREATE_SUBSCRIPTION: create subscription from scratch
 * - ACTIVATE_SUBSCRIPTION: activate a subscription
 * - CHANGE_SUBSCRIPTION_STATE: change subscription state
 * - UPGRADE_PLAN: upgrade plan
 * - DOWNGRADE_PLAN: downgrade plan
 * - CANCEL_SUBSCRIPTION: cancel subscription
 * 
 * Billing & Transactions (SSOT_ADMIN_DOMAIN §6.2):
 * - CREATE_PURCHASE_INTENT: create purchase intent
 * - MODIFY_TRANSACTION: modify billing transactions
 * - EMULATE_PAYMENT: emulate payment or settlement
 * - ISSUE_REFUND: issue refunds
 * 
 * Access & Enforcement (SSOT_ADMIN_DOMAIN §6.3):
 * - BYPASS_BILLING_ENFORCEMENT: override billing enforcement
 * - DIRECT_ACCESS_GRANT: directly grant access or limits
 * - MODIFY_BILLING_PRODUCTS: modify billing products configuration
 */

import 'server-only';
import type { AdminContext } from '@/lib/auth/resolveAdminContext';
import { logAdminValidationRejection, AdminAuditActionCodes } from '@/lib/audit';
import { log } from '@/lib/utils/logger';

// =============================================================================
// Types
// =============================================================================

/**
 * Canonical codes for forbidden admin billing operations.
 * 
 * This is a closed set per SSOT_ADMIN_DOMAIN v1.0 §6.
 */
export type ForbiddenAdminBillingOperationCode =
  // Subscription Lifecycle (§6.1)
  | 'CREATE_SUBSCRIPTION'
  | 'ACTIVATE_SUBSCRIPTION'
  | 'CHANGE_SUBSCRIPTION_STATE'
  | 'UPGRADE_PLAN'
  | 'DOWNGRADE_PLAN'
  | 'CANCEL_SUBSCRIPTION'
  // Billing & Transactions (§6.2)
  | 'CREATE_PURCHASE_INTENT'
  | 'MODIFY_TRANSACTION'
  | 'EMULATE_PAYMENT'
  | 'ISSUE_REFUND'
  // Access & Enforcement (§6.3)
  | 'BYPASS_BILLING_ENFORCEMENT'
  | 'DIRECT_ACCESS_GRANT'
  | 'MODIFY_BILLING_PRODUCTS';

/**
 * Human-readable descriptions for forbidden operations.
 */
const FORBIDDEN_OPERATION_DESCRIPTIONS: Record<ForbiddenAdminBillingOperationCode, string> = {
  // Subscription Lifecycle
  CREATE_SUBSCRIPTION: 'Creating subscriptions from scratch is forbidden for Admin',
  ACTIVATE_SUBSCRIPTION: 'Activating subscriptions is forbidden for Admin',
  CHANGE_SUBSCRIPTION_STATE: 'Changing subscription state is forbidden for Admin',
  UPGRADE_PLAN: 'Upgrading plans is forbidden for Admin',
  DOWNGRADE_PLAN: 'Downgrading plans is forbidden for Admin',
  CANCEL_SUBSCRIPTION: 'Canceling subscriptions is forbidden for Admin',
  // Billing & Transactions
  CREATE_PURCHASE_INTENT: 'Creating purchase intents is forbidden for Admin',
  MODIFY_TRANSACTION: 'Modifying billing transactions is forbidden for Admin',
  EMULATE_PAYMENT: 'Emulating payments is forbidden for Admin',
  ISSUE_REFUND: 'Issuing refunds is forbidden for Admin',
  // Access & Enforcement
  BYPASS_BILLING_ENFORCEMENT: 'Bypassing billing enforcement is forbidden for Admin',
  DIRECT_ACCESS_GRANT: 'Directly granting access or limits is forbidden for Admin',
  MODIFY_BILLING_PRODUCTS: 'Modifying billing products is forbidden for Admin',
};

/**
 * SSOT reference for each forbidden operation.
 */
const FORBIDDEN_OPERATION_SSOT_REFS: Record<ForbiddenAdminBillingOperationCode, string> = {
  CREATE_SUBSCRIPTION: 'SSOT_ADMIN_DOMAIN v1.0 §6.1',
  ACTIVATE_SUBSCRIPTION: 'SSOT_ADMIN_DOMAIN v1.0 §6.1',
  CHANGE_SUBSCRIPTION_STATE: 'SSOT_ADMIN_DOMAIN v1.0 §6.1',
  UPGRADE_PLAN: 'SSOT_ADMIN_DOMAIN v1.0 §6.1',
  DOWNGRADE_PLAN: 'SSOT_ADMIN_DOMAIN v1.0 §6.1',
  CANCEL_SUBSCRIPTION: 'SSOT_ADMIN_DOMAIN v1.0 §6.1',
  CREATE_PURCHASE_INTENT: 'SSOT_ADMIN_DOMAIN v1.0 §6.2',
  MODIFY_TRANSACTION: 'SSOT_ADMIN_DOMAIN v1.0 §6.2',
  EMULATE_PAYMENT: 'SSOT_ADMIN_DOMAIN v1.0 §6.2',
  ISSUE_REFUND: 'SSOT_ADMIN_DOMAIN v1.0 §6.2',
  BYPASS_BILLING_ENFORCEMENT: 'SSOT_ADMIN_DOMAIN v1.0 §6.3',
  DIRECT_ACCESS_GRANT: 'SSOT_ADMIN_DOMAIN v1.0 §6.3',
  MODIFY_BILLING_PRODUCTS: 'SSOT_ADMIN_DOMAIN v1.0 §6.3',
};

// =============================================================================
// Error Class
// =============================================================================

/**
 * Error thrown when admin attempts a forbidden billing operation.
 * 
 * This error is always thrown — no forbidden operation is ever executed.
 */
export class ForbiddenAdminBillingOperation extends Error {
  readonly code = 'FORBIDDEN_ADMIN_OPERATION';
  readonly operationCode: ForbiddenAdminBillingOperationCode;
  readonly ssotReference: string;
  
  constructor(operationCode: ForbiddenAdminBillingOperationCode) {
    const description = FORBIDDEN_OPERATION_DESCRIPTIONS[operationCode];
    const ssotRef = FORBIDDEN_OPERATION_SSOT_REFS[operationCode];
    
    super(`[ForbiddenAdminOperation] ${description} (${ssotRef})`);
    
    this.operationCode = operationCode;
    this.ssotReference = ssotRef;
    this.name = 'ForbiddenAdminBillingOperation';
  }
}

// =============================================================================
// Guard Function
// =============================================================================

/**
 * Assert that an admin billing operation is allowed.
 * 
 * This function ALWAYS throws for operations in the forbidden list.
 * It is used defensively at the start of any admin billing service
 * that could potentially be misused.
 * 
 * USAGE:
 * Call this function BEFORE any billing mutation that might be
 * misinterpreted as allowed. The function will:
 * 1. Log a warning
 * 2. Write an audit rejection record
 * 3. Throw ForbiddenAdminBillingOperation
 * 
 * @param adminContext - Admin context for audit
 * @param operationCode - The forbidden operation being attempted
 * @param target - Target entity (for audit)
 * @throws ForbiddenAdminBillingOperation (always)
 * 
 * @example
 * ```typescript
 * // At the start of any hypothetical subscription management service:
 * await assertAdminBillingOperationAllowed(
 *   adminContext,
 *   'CREATE_SUBSCRIPTION',
 *   { type: 'club', id: clubId }
 * );
 * // ^ This will ALWAYS throw
 * ```
 */
export async function assertAdminBillingOperationAllowed(
  adminContext: AdminContext,
  operationCode: ForbiddenAdminBillingOperationCode,
  target: { type: 'user' | 'club'; id: string },
  reason?: string
): Promise<never> {
  const description = FORBIDDEN_OPERATION_DESCRIPTIONS[operationCode];
  const ssotRef = FORBIDDEN_OPERATION_SSOT_REFS[operationCode];
  
  // Log warning
  log.warn('[ForbiddenAdminOperation] Attempted forbidden billing operation', {
    operationCode,
    description,
    ssotReference: ssotRef,
    actorId: adminContext.actorId,
    targetType: target.type,
    targetId: target.id,
  });
  
  // Determine which audit action to use based on operation category
  // All forbidden operations map to one of the two rejection actions
  const auditAction = operationCode.includes('SUBSCRIPTION') || operationCode.includes('PLAN')
    ? AdminAuditActionCodes.ADMIN_EXTEND_SUBSCRIPTION_REJECTED
    : AdminAuditActionCodes.ADMIN_GRANT_CREDIT_REJECTED;
  
  // Write audit rejection record
  // Per SSOT_ADMIN_AUDIT_RULES v1.0 §2.3: "Failed attempts MUST be audited"
  try {
    await logAdminValidationRejection({
      adminContext,
      actionType: auditAction,
      target: { type: target.type, id: target.id },
      reason: reason || `Attempted forbidden operation: ${operationCode}`,
      errorCode: `FORBIDDEN_${operationCode}`,
      metadata: {
        forbiddenOperationCode: operationCode,
        ssotReference: ssotRef,
      },
    });
  } catch (auditError) {
    // If audit fails, log it but still throw the forbidden error
    log.error('[ForbiddenAdminOperation] Failed to write audit rejection', {
      operationCode,
      auditError: auditError instanceof Error ? auditError.message : 'Unknown',
    });
  }
  
  // Throw error — forbidden operations are NEVER executed
  throw new ForbiddenAdminBillingOperation(operationCode);
}

// =============================================================================
// Utility: Quick Check (No Audit)
// =============================================================================

/**
 * Quick check if an operation code is in the forbidden list.
 * 
 * This is a synchronous check for use in type guards or conditionals.
 * It does NOT audit or throw — use assertAdminBillingOperationAllowed for that.
 */
export function isForbiddenAdminBillingOperation(
  operationCode: string
): operationCode is ForbiddenAdminBillingOperationCode {
  return operationCode in FORBIDDEN_OPERATION_DESCRIPTIONS;
}
