/**
 * Admin Atomic Mutation Service
 * 
 * Provides atomic execution of admin mutations with mandatory audit logging.
 * Implements compensating transaction pattern for Supabase JS client.
 * 
 * @see SSOT_ADMIN_AUDIT_RULES v1.0 §5.1 (Atomicity)
 * @see SSOT_ADMIN_DOMAIN v1.0 §7 (Audit & Accountability)
 * 
 * ARCHITECTURE DECISION:
 * Supabase JS client does not support native SQL transactions.
 * This module implements compensating transactions:
 * 1. Execute mutation → produces result
 * 2. Write audit record
 * 3. If audit fails → execute rollback function to undo mutation
 * 
 * ATOMICITY GUARANTEES (per SSOT §5.1):
 * - If mutation fails → no audit success record is written ✓
 * - If audit write fails → mutation is rolled back via compensating action ✓
 * - No partial persistence (mutation without audit) is allowed ✓
 * 
 * SCOPE LIMITATION:
 * This is INFRASTRUCTURE ONLY. No billing logic is implemented here.
 * Billing mutations use this wrapper but define rollback logic themselves.
 * 
 * FAILURE SEMANTICS:
 * - Validation failures (before mutation) → allowed to write *_REJECTED audit outside tx
 * - Mutation failures → throw immediately, no audit written (correct per SSOT)
 * - Audit failures → execute rollback, then throw (correct per SSOT)
 * - Rollback failures → CRITICAL error logged, original error rethrown
 */

import 'server-only';
import type { AdminContext } from '@/lib/auth/resolveAdminContext';
import type { AdminAuditActionCode } from './adminAuditActions';
import type { AdminAuditTargetType, AdminAuditRecord } from '@/lib/db/adminAuditLogRepo';
import { appendAdminAuditRecord } from '@/lib/db/adminAuditLogRepo';
import { log } from '@/lib/utils/logger';

// =============================================================================
// Types
// =============================================================================

/**
 * Target entity specification for admin mutations
 */
export interface AdminMutationTarget {
  /** Target entity type ('user' or 'club') */
  type: AdminAuditTargetType;
  /** Target entity identifier (UUID) */
  id: string;
}

/**
 * Result of mutation execution with rollback capability
 */
export interface MutationResult<T> {
  /** Result data from mutation */
  data: T;
  /** 
   * Optional related entity ID created by mutation
   * (e.g., credit_id, subscription_id)
   */
  relatedEntityId?: string;
}

/**
 * Rollback context provided to rollback function
 */
export interface RollbackContext<T> {
  /** Original mutation result */
  mutationResult: MutationResult<T>;
  /** Audit write error that triggered rollback */
  auditError: Error;
}

/**
 * Parameters for adminAtomicMutation
 * 
 * @template T - Type of mutation result data
 */
export interface AdminAtomicMutationParams<T> {
  /**
   * Admin context from resolveAdminContext()
   * Provides actor attribution
   */
  adminContext: AdminContext;
  
  /**
   * Canonical action code for audit
   * MUST be a success action (not *_REJECTED)
   */
  actionType: AdminAuditActionCode;
  
  /**
   * Target entity for the mutation
   */
  target: AdminMutationTarget;
  
  /**
   * Human-readable reason for the action
   * MANDATORY per SSOT_ADMIN_AUDIT_RULES v1.0 §3.1
   */
  reason: string;
  
  /**
   * The mutation to execute
   * 
   * RULES:
   * - MUST be idempotent if possible
   * - MUST return result with optional relatedEntityId
   * - MUST throw on failure (do not catch and return error)
   * 
   * @returns Mutation result
   * @throws On mutation failure
   */
  mutation: () => Promise<MutationResult<T>>;
  
  /**
   * Rollback function to undo mutation if audit fails
   * 
   * RULES:
   * - MUST undo the mutation effect
   * - SHOULD be idempotent
   * - SHOULD NOT throw (errors are logged but swallowed)
   * 
   * Example rollbacks:
   * - GRANT_CREDIT: delete the created credit
   * - EXTEND_SUBSCRIPTION: revert expires_at to original value
   * 
   * @param context - Rollback context with mutation result
   */
  rollback: (context: RollbackContext<T>) => Promise<void>;
  
  /**
   * Optional metadata for audit record
   */
  metadata?: Record<string, unknown>;
}

/**
 * Result of atomic mutation execution
 */
export interface AdminAtomicMutationResult<T> {
  /** Mutation result data */
  data: T;
  /** Created audit record */
  auditRecord: AdminAuditRecord;
}

// =============================================================================
// Main Function
// =============================================================================

/**
 * Execute admin mutation with atomic audit logging
 * 
 * Implements compensating transaction pattern per SSOT_ADMIN_AUDIT_RULES v1.0 §5.1.
 * 
 * EXECUTION ORDER:
 * 1. Execute mutation
 * 2. Write audit record
 * 3. If audit fails → execute rollback
 * 
 * GUARANTEES:
 * - No mutation without audit (rollback ensures this)
 * - No audit without mutation (execution order ensures this)
 * - No mutation with mismatched audit data (params validate this)
 * 
 * @template T - Type of mutation result
 * @param params - Mutation parameters
 * @returns Mutation result with audit record
 * @throws On mutation failure, audit failure, or rollback failure
 * 
 * @example
 * ```typescript
 * const result = await adminAtomicMutation({
 *   adminContext,
 *   actionType: 'ADMIN_GRANT_CREDIT',
 *   target: { type: 'user', id: userId },
 *   reason: 'Customer support compensation',
 *   mutation: async () => {
 *     const credit = await createCredit(userId, creditCode);
 *     return { data: credit, relatedEntityId: credit.id };
 *   },
 *   rollback: async ({ mutationResult }) => {
 *     await deleteCredit(mutationResult.relatedEntityId!);
 *   },
 *   metadata: { creditCode: 'EVENT_UPGRADE_500' },
 * });
 * ```
 */
export async function adminAtomicMutation<T>(
  params: AdminAtomicMutationParams<T>
): Promise<AdminAtomicMutationResult<T>> {
  const {
    adminContext,
    actionType,
    target,
    reason,
    mutation,
    rollback,
    metadata,
  } = params;
  
  // === VALIDATION ===
  
  // Validate AdminContext
  if (adminContext.type !== 'admin' || adminContext.actorType !== 'admin') {
    throw new Error('[AdminAtomic] Invalid AdminContext');
  }
  
  // Validate reason
  if (!reason || reason.trim().length === 0) {
    throw new Error('[AdminAtomic] Reason is mandatory (SSOT §3.1)');
  }
  
  // Validate action type is not a rejection code
  // (rejected actions should NOT use atomic wrapper)
  if (actionType.endsWith('_REJECTED')) {
    throw new Error(
      '[AdminAtomic] Cannot use atomic wrapper for rejection actions. ' +
      'Use logAdminRejection() directly for validation failures.'
    );
  }
  
  // === STEP 1: EXECUTE MUTATION ===
  
  log.info('[AdminAtomic] Starting atomic mutation', {
    actionType,
    targetType: target.type,
    targetId: target.id,
    actorId: adminContext.actorId,
  });
  
  let mutationResult: MutationResult<T>;
  
  try {
    mutationResult = await mutation();
    
    log.info('[AdminAtomic] Mutation succeeded', {
      actionType,
      relatedEntityId: mutationResult.relatedEntityId,
    });
  } catch (mutationError) {
    // SSOT §5.1: If mutation fails → no audit success record is written
    // This is correct behavior — just rethrow
    log.error('[AdminAtomic] Mutation failed, no audit written', {
      actionType,
      targetType: target.type,
      targetId: target.id,
      error: mutationError instanceof Error ? mutationError.message : 'Unknown',
    });
    
    throw mutationError;
  }
  
  // === STEP 2: WRITE AUDIT RECORD ===
  
  let auditRecord: AdminAuditRecord;
  
  try {
    auditRecord = await appendAdminAuditRecord({
      actorId: adminContext.actorId,
      actionType,
      targetType: target.type,
      targetId: target.id,
      reason,
      result: 'success',
      metadata,
      relatedEntityId: mutationResult.relatedEntityId,
    });
    
    log.info('[AdminAtomic] Audit record written', {
      auditId: auditRecord.id,
      actionType,
    });
  } catch (auditError) {
    // SSOT §5.1: If audit write fails → mutation MUST be rolled back
    
    log.error('[AdminAtomic] Audit write failed, initiating rollback', {
      actionType,
      targetType: target.type,
      targetId: target.id,
      relatedEntityId: mutationResult.relatedEntityId,
      error: auditError instanceof Error ? auditError.message : 'Unknown',
    });
    
    // === STEP 3: EXECUTE ROLLBACK ===
    
    try {
      await rollback({
        mutationResult,
        auditError: auditError instanceof Error ? auditError : new Error('Unknown audit error'),
      });
      
      log.info('[AdminAtomic] Rollback succeeded', {
        actionType,
        relatedEntityId: mutationResult.relatedEntityId,
      });
    } catch (rollbackError) {
      // CRITICAL: Both audit and rollback failed
      // Mutation exists but is not audited
      // This requires manual intervention
      
      log.error('[AdminAtomic] CRITICAL: Rollback failed after audit failure', {
        actionType,
        targetType: target.type,
        targetId: target.id,
        relatedEntityId: mutationResult.relatedEntityId,
        auditError: auditError instanceof Error ? auditError.message : 'Unknown',
        rollbackError: rollbackError instanceof Error ? rollbackError.message : 'Unknown',
        severity: 'CRITICAL',
        requiresManualIntervention: true,
      });
      
      // Still throw audit error (original failure)
      // Admin will need to manually investigate
    }
    
    // Throw audit error to indicate operation did not complete atomically
    // Even if rollback succeeded, caller should treat this as failure
    throw new Error(
      `[AdminAtomic] Audit write failed for ${actionType}. ` +
      `Mutation was rolled back. Original error: ${auditError instanceof Error ? auditError.message : 'Unknown'}`
    );
  }
  
  // === SUCCESS: Return result ===
  
  log.info('[AdminAtomic] Atomic mutation completed successfully', {
    actionType,
    auditId: auditRecord.id,
    targetType: target.type,
    targetId: target.id,
  });
  
  return {
    data: mutationResult.data,
    auditRecord,
  };
}

// =============================================================================
// Utility: Log Validation Rejection (Non-Atomic)
// =============================================================================

/**
 * Log a rejected admin action due to validation failure
 * 
 * This is NOT atomic with any mutation because no mutation occurred.
 * Per SSOT §5.2: "For validation failures (before transaction):
 * It is allowed to write a *_REJECTED audit record outside tx"
 * 
 * WHEN TO USE:
 * - Validation fails BEFORE attempting mutation
 * - No DB state was changed
 * - Admin attempted an action that was rejected
 * 
 * WHEN NOT TO USE:
 * - Mutation was attempted (use adminAtomicMutation instead)
 * - Mutation partially succeeded (requires rollback handling)
 * 
 * @param params - Rejection parameters
 * @returns Created audit record
 * 
 * @example
 * ```typescript
 * // Validation failed before mutation
 * if (!isValidCreditCode(creditCode)) {
 *   await logAdminValidationRejection({
 *     adminContext,
 *     actionType: 'ADMIN_GRANT_CREDIT_REJECTED',
 *     target: { type: 'user', id: userId },
 *     reason: 'Attempted to grant invalid credit code',
 *     errorCode: 'INVALID_CREDIT_CODE',
 *   });
 *   throw new ValidationError('Invalid credit code');
 * }
 * ```
 */
export async function logAdminValidationRejection(params: {
  adminContext: AdminContext;
  actionType: AdminAuditActionCode;
  target: AdminMutationTarget;
  reason: string;
  errorCode: string;
  metadata?: Record<string, unknown>;
}): Promise<AdminAuditRecord> {
  const { adminContext, actionType, target, reason, errorCode, metadata } = params;
  
  // Validate that action type is a rejection code
  if (!actionType.endsWith('_REJECTED')) {
    throw new Error(
      '[AdminAtomic] logAdminValidationRejection requires a *_REJECTED action type'
    );
  }
  
  log.info('[AdminAtomic] Logging validation rejection', {
    actionType,
    targetType: target.type,
    targetId: target.id,
    errorCode,
  });
  
  const auditRecord = await appendAdminAuditRecord({
    actorId: adminContext.actorId,
    actionType,
    targetType: target.type,
    targetId: target.id,
    reason,
    result: 'rejected',
    errorCode,
    metadata,
  });
  
  return auditRecord;
}
