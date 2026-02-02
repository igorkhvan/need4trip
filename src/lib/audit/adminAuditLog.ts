/**
 * Admin Audit Log Service
 * 
 * Service layer for recording admin audit events.
 * 
 * @see SSOT_ADMIN_AUDIT_RULES v1.0 §3 (Audit Record Structure)
 * @see SSOT_ADMIN_AUDIT_RULES v1.0 §5 (Atomicity)
 * 
 * RULES:
 * - Accepts AdminContext (from resolveAdminContext)
 * - Uses typed action codes (from adminAuditActions.ts)
 * - THROWS on failure (no fire-and-forget)
 * 
 * ATOMICITY (SSOT §5.1):
 * For mutations that require atomic audit logging, use `adminAtomicMutation()`
 * from `@/lib/audit/adminAtomic` instead of calling `logAdminAction()` directly.
 * 
 * The functions in this file are suitable for:
 * - Logging rejected actions (validation failures before mutation)
 * - Standalone audit records not tied to mutations
 * 
 * USAGE (non-atomic):
 * ```typescript
 * import { logAdminRejection } from '@/lib/audit/adminAuditLog';
 * 
 * // For validation failures (no mutation occurred)
 * await logAdminRejection({
 *   adminContext,
 *   action: 'ADMIN_GRANT_CREDIT_REJECTED',
 *   targetType: 'user',
 *   targetId: userId,
 *   reason: 'Invalid credit code',
 *   result: 'rejected',
 *   errorCode: 'INVALID_CREDIT_CODE',
 * });
 * ```
 * 
 * USAGE (atomic - use adminAtomic.ts instead):
 * ```typescript
 * import { adminAtomicMutation } from '@/lib/audit/adminAtomic';
 * 
 * // For mutations that must be atomic with audit
 * await adminAtomicMutation({
 *   adminContext,
 *   actionType: 'ADMIN_GRANT_CREDIT',
 *   target: { type: 'user', id: userId },
 *   reason: 'Customer support compensation',
 *   mutation: async () => { ... },
 *   rollback: async () => { ... },
 * });
 * ```
 */

import 'server-only';
import type { AdminContext } from '@/lib/auth/resolveAdminContext';
import type { AdminAuditActionCode } from './adminAuditActions';
import {
  appendAdminAuditRecord,
  type AdminAuditResult,
  type AdminAuditTargetType,
  type AdminAuditRecord,
} from '@/lib/db/adminAuditLogRepo';

// =============================================================================
// Types
// =============================================================================

/**
 * Parameters for logging an admin action
 * 
 * This interface enforces SSOT_ADMIN_AUDIT_RULES v1.0 §3.1 requirements:
 * - adminContext: provides actor_type and actor_id
 * - action: canonical action code
 * - targetType/targetId: identifies affected entity
 * - reason: human-readable justification (MANDATORY)
 * - result: success or rejected
 */
export interface LogAdminActionParams {
  /**
   * Admin context from resolveAdminContext()
   * Provides actor attribution (actorType, actorId)
   */
  adminContext: AdminContext;
  
  /**
   * Canonical action code from SSOT_ADMIN_AUDIT_RULES v1.0 §4
   */
  action: AdminAuditActionCode;
  
  /**
   * Type of target entity
   */
  targetType: AdminAuditTargetType;
  
  /**
   * Identifier of target entity (UUID)
   */
  targetId: string;
  
  /**
   * Human-readable justification for the action
   * MANDATORY per SSOT_ADMIN_AUDIT_RULES v1.0 §3.1
   */
  reason: string;
  
  /**
   * Result of the action
   */
  result: AdminAuditResult;
  
  /**
   * Optional structured metadata
   * e.g. { creditCode: 'EVENT_UPGRADE_500', daysExtended: 30 }
   */
  metadata?: Record<string, unknown>;
  
  /**
   * Optional related entity ID
   * e.g. the credit_id or subscription_id created/modified
   */
  relatedEntityId?: string;
  
  /**
   * Optional error code (required if result is 'rejected')
   */
  errorCode?: string;
}

/**
 * Convenience type for success actions
 */
export interface LogAdminSuccessParams extends Omit<LogAdminActionParams, 'result' | 'errorCode'> {
  result?: 'success';
}

/**
 * Convenience type for rejected actions
 */
export interface LogAdminRejectedParams extends Omit<LogAdminActionParams, 'result'> {
  result: 'rejected';
  errorCode: string; // Required for rejected actions
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Log an admin action to the audit log
 * 
 * CRITICAL: This function THROWS on failure.
 * Admin audit is mandatory and cannot be fire-and-forget.
 * 
 * ATOMICITY NOTE (SSOT §5.1):
 * This function writes audit records but does NOT provide atomicity
 * with mutations. For mutations that require atomic audit logging:
 * 
 *   USE: adminAtomicMutation() from @/lib/audit/adminAtomic
 * 
 * This function is appropriate for:
 * - Rejected actions (validation failures before mutation)
 * - Standalone audit records not tied to mutations
 * 
 * @param params - Action parameters
 * @returns Created audit record
 * @throws Error if audit write fails
 */
export async function logAdminAction(
  params: LogAdminActionParams
): Promise<AdminAuditRecord> {
  const {
    adminContext,
    action,
    targetType,
    targetId,
    reason,
    result,
    metadata,
    relatedEntityId,
    errorCode,
  } = params;
  
  // Validate AdminContext
  if (adminContext.type !== 'admin' || adminContext.actorType !== 'admin') {
    throw new Error('logAdminAction requires a valid AdminContext');
  }
  
  // Validate reason is provided and non-empty
  if (!reason || reason.trim().length === 0) {
    throw new Error('Admin action MUST have a non-empty reason (SSOT §3.1)');
  }
  
  // Validate errorCode is provided for rejected actions
  if (result === 'rejected' && !errorCode) {
    throw new Error('Rejected admin actions MUST have an errorCode');
  }
  
  // Create audit record
  const record = await appendAdminAuditRecord({
    actorId: adminContext.actorId,
    actionType: action,
    targetType,
    targetId,
    reason,
    result,
    metadata,
    relatedEntityId,
    errorCode,
  });
  
  return record;
}

/**
 * Log a successful admin action
 * 
 * Convenience wrapper for success cases.
 * 
 * @param params - Action parameters (result defaults to 'success')
 * @returns Created audit record
 */
export async function logAdminSuccess(
  params: LogAdminSuccessParams
): Promise<AdminAuditRecord> {
  return logAdminAction({
    ...params,
    result: 'success',
  });
}

/**
 * Log a rejected admin action
 * 
 * Convenience wrapper for rejected cases.
 * Requires errorCode.
 * 
 * @param params - Action parameters with required errorCode
 * @returns Created audit record
 */
export async function logAdminRejection(
  params: LogAdminRejectedParams
): Promise<AdminAuditRecord> {
  return logAdminAction(params);
}

// =============================================================================
// Re-exports for convenience
// =============================================================================

export type { AdminAuditResult, AdminAuditTargetType, AdminAuditRecord };
export { AdminAuditActionCodes } from './adminAuditActions';
export type { AdminAuditActionCode } from './adminAuditActions';
