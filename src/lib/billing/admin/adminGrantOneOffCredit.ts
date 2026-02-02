/**
 * Admin Grant One-Off Credit Service
 * 
 * Implements GAP-5: Admin credit grant function.
 * 
 * @see SSOT_ADMIN_DOMAIN v1.0 §5.1 (One-Off Credit Grant)
 * @see SSOT_BILLING_ADMIN_RULES v1.0 §3 (One-Off Credit Grant Semantics)
 * @see SSOT_ADMIN_AUDIT_RULES v1.0 §5 (Atomicity)
 * 
 * BEHAVIOR:
 * 1. Validate adminContext, user exists, creditCode is valid
 * 2. Create admin billing transaction (non-financial marker)
 * 3. Create billing credit with source='admin'
 * 4. Write SUCCESS audit atomically
 * 
 * HARD GUARDS (SSOT §3.3):
 * - MUST NOT bypass billing enforcement
 * - MUST NOT auto-consume credit
 * - MUST NOT grant access directly
 * - Credit behaves identically to user-purchased credit after creation
 * 
 * CREDIT PROPERTIES (SSOT §3.1):
 * - status = 'available'
 * - consumed_event_id = NULL (not bound to event)
 * - source = 'admin'
 * - no expiration unless defined by product rules
 */

import 'server-only';
import type { AdminContext } from '@/lib/auth/resolveAdminContext';
import type { BillingCredit, CreditCode, CreditSource } from '@/lib/types/billing';
import type { AdminAuditRecord } from '@/lib/db/adminAuditLogRepo';
import {
  adminAtomicMutation,
  logAdminValidationRejection,
  AdminAuditActionCodes,
} from '@/lib/audit';
import { getUserById } from '@/lib/db/userRepo';
import { getAdminDb } from '@/lib/db/client';
import { CREDIT_CODES } from '@/lib/types/billing';
import { log } from '@/lib/utils/logger';

// =============================================================================
// Types
// =============================================================================

/**
 * Parameters for admin credit grant.
 */
export interface AdminGrantCreditParams {
  /**
   * Admin context from resolveAdminContext().
   */
  adminContext: AdminContext;
  
  /**
   * User ID to receive the credit.
   */
  userId: string;
  
  /**
   * Credit code to grant.
   * Must be a valid credit code from CREDIT_CODES.
   */
  creditCode: CreditCode;
  
  /**
   * Human-readable reason for the grant.
   * MANDATORY per SSOT_ADMIN_AUDIT_RULES v1.0 §3.1.
   */
  reason: string;
}

/**
 * Result of admin credit grant.
 */
export interface AdminGrantCreditResult {
  /**
   * Created billing credit.
   */
  credit: BillingCredit;
  
  /**
   * Audit record for the grant.
   */
  auditRecord: AdminAuditRecord;
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validate credit code against allowed codes.
 */
function isValidCreditCode(code: string): code is CreditCode {
  return CREDIT_CODES.includes(code as CreditCode);
}

// =============================================================================
// Repository-Level Functions (Private)
// =============================================================================

/**
 * Create admin billing transaction (non-financial marker).
 * 
 * This transaction:
 * - Has amount = 0 (no financial value)
 * - Has provider = 'admin-grant'
 * - Has status = 'completed' (immediately settled)
 * - Serves as FK target for billing_credits.source_transaction_id
 * 
 * Per SSOT_BILLING_ADMIN_RULES v1.0 §3.2:
 * "optionally create a non-financial billing transaction record"
 * 
 * We create it because DB schema requires source_transaction_id NOT NULL.
 */
async function createAdminTransaction(
  userId: string,
  creditCode: CreditCode
): Promise<string> {
  const db = getAdminDb();
  
  const { data, error } = await db
    .from('billing_transactions')
    .insert({
      user_id: userId,
      club_id: null, // Not club-related
      plan_id: null, // Not plan-related
      product_code: creditCode,
      provider: 'admin-grant',
      provider_payment_id: null,
      amount: 0, // Non-financial
      currency_code: 'KZT',
      status: 'completed', // Immediately settled
      period_start: null,
      period_end: null,
    })
    .select('id')
    .single();
  
  if (error || !data) {
    log.error('[AdminGrantCredit] Failed to create admin transaction', {
      userId,
      creditCode,
      error,
    });
    throw new Error(`Failed to create admin transaction: ${error?.message ?? 'Unknown error'}`);
  }
  
  return data.id;
}

/**
 * Create billing credit with admin source.
 */
async function createAdminCredit(
  userId: string,
  creditCode: CreditCode,
  sourceTransactionId: string
): Promise<BillingCredit> {
  const db = getAdminDb();
  
  const { data, error } = await db
    .from('billing_credits')
    .insert({
      user_id: userId,
      credit_code: creditCode,
      status: 'available',
      source: 'admin' as CreditSource,
      consumed_event_id: null,
      consumed_at: null,
      source_transaction_id: sourceTransactionId,
    })
    .select('*')
    .single();
  
  if (error || !data) {
    log.error('[AdminGrantCredit] Failed to create credit', {
      userId,
      creditCode,
      sourceTransactionId,
      error,
    });
    throw new Error(`Failed to create credit: ${error?.message ?? 'Unknown error'}`);
  }
  
  return {
    id: data.id,
    userId: data.user_id,
    creditCode: data.credit_code as CreditCode,
    status: data.status as 'available' | 'consumed',
    source: data.source as CreditSource,
    consumedEventId: data.consumed_event_id,
    consumedAt: data.consumed_at,
    sourceTransactionId: data.source_transaction_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Delete billing credit (for rollback).
 */
async function deleteCredit(creditId: string): Promise<void> {
  const db = getAdminDb();
  
  const { error } = await db
    .from('billing_credits')
    .delete()
    .eq('id', creditId);
  
  if (error) {
    log.error('[AdminGrantCredit] Failed to delete credit (rollback)', {
      creditId,
      error,
    });
    throw new Error(`Failed to rollback credit: ${error.message}`);
  }
}

/**
 * Delete billing transaction (for rollback).
 */
async function deleteTransaction(transactionId: string): Promise<void> {
  const db = getAdminDb();
  
  const { error } = await db
    .from('billing_transactions')
    .delete()
    .eq('id', transactionId);
  
  if (error) {
    log.error('[AdminGrantCredit] Failed to delete transaction (rollback)', {
      transactionId,
      error,
    });
    throw new Error(`Failed to rollback transaction: ${error.message}`);
  }
}

// =============================================================================
// Main Service Function
// =============================================================================

/**
 * Grant a one-off credit to a user via admin action.
 * 
 * This function:
 * 1. Validates inputs (adminContext, user existence, credit code)
 * 2. Creates admin transaction + credit atomically with audit
 * 3. On audit failure, rolls back both transaction and credit
 * 
 * SSOT COMPLIANCE:
 * - Credit has source='admin' (SSOT_BILLING_ADMIN_RULES §1.3)
 * - Credit has status='available' (SSOT_BILLING_ADMIN_RULES §3.1)
 * - Credit is not bound to event (consumed_event_id=NULL)
 * - Audit is mandatory and atomic (SSOT_ADMIN_AUDIT_RULES §5.1)
 * 
 * @param params - Grant parameters
 * @returns Created credit with audit record
 * @throws On validation failure or mutation failure
 * 
 * @example
 * ```typescript
 * const result = await adminGrantOneOffCredit({
 *   adminContext,
 *   userId: 'user-uuid',
 *   creditCode: 'EVENT_UPGRADE_500',
 *   reason: 'Customer support compensation for service disruption',
 * });
 * ```
 */
export async function adminGrantOneOffCredit(
  params: AdminGrantCreditParams
): Promise<AdminGrantCreditResult> {
  const { adminContext, userId, creditCode, reason } = params;
  
  // === VALIDATION ===
  
  // 1. Validate AdminContext
  if (!adminContext || adminContext.type !== 'admin') {
    log.error('[AdminGrantCredit] Invalid AdminContext');
    throw new Error('Invalid AdminContext: admin authentication required');
  }
  
  // 2. Validate reason is provided
  if (!reason || reason.trim().length === 0) {
    await logAdminValidationRejection({
      adminContext,
      actionType: AdminAuditActionCodes.ADMIN_GRANT_CREDIT_REJECTED,
      target: { type: 'user', id: userId },
      reason: 'Attempted to grant credit without providing reason',
      errorCode: 'REASON_REQUIRED',
    });
    throw new Error('Reason is mandatory for admin credit grant (SSOT §3.1)');
  }
  
  // 3. Validate credit code
  if (!isValidCreditCode(creditCode)) {
    await logAdminValidationRejection({
      adminContext,
      actionType: AdminAuditActionCodes.ADMIN_GRANT_CREDIT_REJECTED,
      target: { type: 'user', id: userId },
      reason: `Attempted to grant invalid credit code: ${creditCode}`,
      errorCode: 'INVALID_CREDIT_CODE',
      metadata: { providedCreditCode: creditCode, validCodes: CREDIT_CODES },
    });
    throw new Error(`Invalid credit code: ${creditCode}. Valid codes: ${CREDIT_CODES.join(', ')}`);
  }
  
  // 4. Validate user exists
  const user = await getUserById(userId);
  if (!user) {
    await logAdminValidationRejection({
      adminContext,
      actionType: AdminAuditActionCodes.ADMIN_GRANT_CREDIT_REJECTED,
      target: { type: 'user', id: userId },
      reason: 'Attempted to grant credit to non-existent user',
      errorCode: 'USER_NOT_FOUND',
    });
    throw new Error(`User not found: ${userId}`);
  }
  
  log.info('[AdminGrantCredit] Validation passed, executing atomic mutation', {
    userId,
    creditCode,
    actorId: adminContext.actorId,
  });
  
  // === ATOMIC MUTATION ===
  
  // Track created resources for rollback
  let createdTransactionId: string | null = null;
  
  const result = await adminAtomicMutation<BillingCredit>({
    adminContext,
    actionType: AdminAuditActionCodes.ADMIN_GRANT_CREDIT,
    target: { type: 'user', id: userId },
    reason,
    metadata: {
      creditCode,
      userName: user.name,
    },
    
    mutation: async () => {
      // Step 1: Create admin transaction (non-financial marker)
      createdTransactionId = await createAdminTransaction(userId, creditCode);
      
      // Step 2: Create credit with source='admin'
      const credit = await createAdminCredit(userId, creditCode, createdTransactionId);
      
      return {
        data: credit,
        relatedEntityId: credit.id,
      };
    },
    
    rollback: async ({ mutationResult }) => {
      // Rollback in reverse order: credit first, then transaction
      const creditId = mutationResult.relatedEntityId;
      
      if (creditId) {
        try {
          await deleteCredit(creditId);
          log.info('[AdminGrantCredit] Rollback: deleted credit', { creditId });
        } catch (e) {
          log.error('[AdminGrantCredit] Rollback: failed to delete credit', { 
            creditId, 
            error: e instanceof Error ? e.message : 'Unknown',
          });
        }
      }
      
      if (createdTransactionId) {
        try {
          await deleteTransaction(createdTransactionId);
          log.info('[AdminGrantCredit] Rollback: deleted transaction', { 
            transactionId: createdTransactionId,
          });
        } catch (e) {
          log.error('[AdminGrantCredit] Rollback: failed to delete transaction', {
            transactionId: createdTransactionId,
            error: e instanceof Error ? e.message : 'Unknown',
          });
        }
      }
    },
  });
  
  log.info('[AdminGrantCredit] Credit granted successfully', {
    creditId: result.data.id,
    userId,
    creditCode,
    auditId: result.auditRecord.id,
  });
  
  return {
    credit: result.data,
    auditRecord: result.auditRecord,
  };
}
