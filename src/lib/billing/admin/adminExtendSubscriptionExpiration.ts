/**
 * Admin Extend Subscription Expiration Service
 * 
 * Implements GAP-6: Guarded subscription extension.
 * 
 * @see SSOT_ADMIN_DOMAIN v1.0 §5.2 (Subscription Extension)
 * @see SSOT_BILLING_ADMIN_RULES v1.0 §4 (Subscription Extension Semantics)
 * @see SSOT_ADMIN_AUDIT_RULES v1.0 §5 (Atomicity)
 * 
 * BEHAVIOR:
 * 1. Validate adminContext, club exists, subscription exists
 * 2. Validate subscription state is eligible (active, grace, expired)
 * 3. Update ONLY expires_at (add N days)
 * 4. Write SUCCESS audit atomically
 * 
 * HARD GUARDS (SSOT §4.3 Prohibited Side-Effects):
 * - MUST NOT change plan_id
 * - MUST NOT change subscription state
 * - MUST NOT reset usage counters
 * - MUST NOT re-enable blocked actions implicitly
 * - Extension ≠ activation ≠ renewal ≠ purchase
 * 
 * ELIGIBLE STATES (SSOT §4.2):
 * - 'active': extend active subscription
 * - 'grace': extend grace period
 * - 'expired': extend expiration date only (does NOT reactivate)
 */

import 'server-only';
import type { AdminContext } from '@/lib/auth/resolveAdminContext';
import type { ClubSubscription, SubscriptionStatus, PlanId } from '@/lib/types/billing';
import type { AdminAuditRecord } from '@/lib/db/adminAuditLogRepo';
import {
  adminAtomicMutation,
  logAdminValidationRejection,
  AdminAuditActionCodes,
} from '@/lib/audit';
import { getClubById } from '@/lib/db/clubRepo';
import { getClubSubscription } from '@/lib/db/clubSubscriptionRepo';
import { getAdminDb } from '@/lib/db/client';
import { log } from '@/lib/utils/logger';

// =============================================================================
// Types
// =============================================================================

/**
 * Parameters for admin subscription extension.
 */
export interface AdminExtendSubscriptionParams {
  /**
   * Admin context from resolveAdminContext().
   */
  adminContext: AdminContext;
  
  /**
   * Club ID whose subscription to extend.
   */
  clubId: string;
  
  /**
   * Number of days to extend.
   * Must be positive integer.
   */
  days: number;
  
  /**
   * Human-readable reason for the extension.
   * MANDATORY per SSOT_ADMIN_AUDIT_RULES v1.0 §3.1.
   */
  reason: string;
}

/**
 * Result of admin subscription extension.
 */
export interface AdminExtendSubscriptionResult {
  /**
   * Updated subscription with new expiration.
   */
  subscription: ClubSubscription;
  
  /**
   * Previous expiration date (for audit).
   */
  previousExpiresAt: string | null;
  
  /**
   * New expiration date after extension.
   */
  newExpiresAt: string;
  
  /**
   * Audit record for the extension.
   */
  auditRecord: AdminAuditRecord;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Subscription states eligible for admin extension.
 * Per SSOT_BILLING_ADMIN_RULES v1.0 §4.2.
 */
const ELIGIBLE_STATES: readonly SubscriptionStatus[] = ['active', 'grace', 'expired'] as const;

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Check if subscription state is eligible for extension.
 */
function isEligibleState(status: SubscriptionStatus): boolean {
  return ELIGIBLE_STATES.includes(status);
}

/**
 * Calculate new expiration date.
 * 
 * If currentExpiresAt is in the past, use NOW() as base.
 * If currentExpiresAt is in the future, extend from that date.
 */
function calculateNewExpiresAt(
  currentExpiresAt: string | null,
  daysToAdd: number
): string {
  // Base date: current expiration or now if null/past
  const now = new Date();
  let baseDate: Date;
  
  if (!currentExpiresAt) {
    baseDate = now;
  } else {
    const current = new Date(currentExpiresAt);
    baseDate = current > now ? current : now;
  }
  
  // Add days
  const newDate = new Date(baseDate);
  newDate.setDate(newDate.getDate() + daysToAdd);
  
  return newDate.toISOString();
}

// =============================================================================
// Repository-Level Functions (Private)
// =============================================================================

/**
 * Update subscription current_period_end (expires_at) ONLY.
 * 
 * NOTE: In DB schema, expiration is stored as `current_period_end`.
 * SSOT uses term `expires_at` conceptually — same meaning.
 * 
 * CRITICAL: This function MUST NOT modify any other fields.
 * Per SSOT_BILLING_ADMIN_RULES v1.0 §4.1: "No other fields may be changed."
 */
async function updateSubscriptionExpiresAt(
  clubId: string,
  newExpiresAt: string
): Promise<ClubSubscription> {
  const db = getAdminDb();
  
  // IMPORTANT: Only update current_period_end (expires_at) and updated_at
  // Per SSOT §4.1: Modify expires_at ONLY
  const { data, error } = await db
    .from('club_subscriptions')
    .update({
      current_period_end: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('club_id', clubId)
    .select('*')
    .single();
  
  if (error || !data) {
    log.error('[AdminExtendSubscription] Failed to update current_period_end (expires_at)', {
      clubId,
      newExpiresAt,
      error,
    });
    throw new Error(`Failed to update subscription: ${error?.message ?? 'Unknown error'}`);
  }
  
  // Map to domain type
  return {
    clubId: data.club_id,
    planId: data.plan_id as PlanId,
    status: data.status as SubscriptionStatus,
    currentPeriodStart: data.current_period_start ?? null,
    currentPeriodEnd: data.current_period_end ?? null,
    graceUntil: data.grace_until ?? null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Revert subscription current_period_end (expires_at) to previous value (for rollback).
 */
async function revertSubscriptionExpiresAt(
  clubId: string,
  previousExpiresAt: string | null
): Promise<void> {
  const db = getAdminDb();
  
  const { error } = await db
    .from('club_subscriptions')
    .update({
      current_period_end: previousExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('club_id', clubId);
  
  if (error) {
    log.error('[AdminExtendSubscription] Failed to revert current_period_end (rollback)', {
      clubId,
      previousExpiresAt,
      error,
    });
    throw new Error(`Failed to rollback subscription: ${error.message}`);
  }
}

// =============================================================================
// Main Service Function
// =============================================================================

/**
 * Extend a club subscription's expiration date via admin action.
 * 
 * This function:
 * 1. Validates inputs (adminContext, club existence, subscription existence)
 * 2. Validates subscription state is eligible (active, grace, expired)
 * 3. Updates ONLY expires_at, preserving all other fields
 * 4. Writes audit atomically
 * 5. On audit failure, reverts expires_at to previous value
 * 
 * SSOT COMPLIANCE:
 * - Only expires_at is modified (SSOT_BILLING_ADMIN_RULES §4.1)
 * - Subscription state is preserved (SSOT §4.2)
 * - Plan is preserved (SSOT §4.3)
 * - Audit is mandatory and atomic (SSOT_ADMIN_AUDIT_RULES §5.1)
 * 
 * IMPORTANT:
 * - Extension does NOT reactivate expired subscriptions
 * - Extension does NOT change subscription status
 * - Extension does NOT reset any counters or limits
 * - All access decisions continue to be enforced by billing logic
 * 
 * @param params - Extension parameters
 * @returns Updated subscription with audit record
 * @throws On validation failure or mutation failure
 * 
 * @example
 * ```typescript
 * const result = await adminExtendSubscriptionExpiration({
 *   adminContext,
 *   clubId: 'club-uuid',
 *   days: 30,
 *   reason: 'Grace extension due to payment processing issue',
 * });
 * ```
 */
export async function adminExtendSubscriptionExpiration(
  params: AdminExtendSubscriptionParams
): Promise<AdminExtendSubscriptionResult> {
  const { adminContext, clubId, days, reason } = params;
  
  // === VALIDATION ===
  
  // 1. Validate AdminContext
  if (!adminContext || adminContext.type !== 'admin') {
    log.error('[AdminExtendSubscription] Invalid AdminContext');
    throw new Error('Invalid AdminContext: admin authentication required');
  }
  
  // 2. Validate reason is provided
  if (!reason || reason.trim().length === 0) {
    await logAdminValidationRejection({
      adminContext,
      actionType: AdminAuditActionCodes.ADMIN_EXTEND_SUBSCRIPTION_REJECTED,
      target: { type: 'club', id: clubId },
      reason: 'Attempted to extend subscription without providing reason',
      errorCode: 'REASON_REQUIRED',
    });
    throw new Error('Reason is mandatory for admin subscription extension (SSOT §3.1)');
  }
  
  // 3. Validate days is positive
  if (!Number.isInteger(days) || days <= 0) {
    await logAdminValidationRejection({
      adminContext,
      actionType: AdminAuditActionCodes.ADMIN_EXTEND_SUBSCRIPTION_REJECTED,
      target: { type: 'club', id: clubId },
      reason: `Invalid extension days: ${days}. Must be positive integer.`,
      errorCode: 'INVALID_DAYS',
      metadata: { providedDays: days },
    });
    throw new Error(`Days must be a positive integer, got: ${days}`);
  }
  
  // 4. Validate club exists
  const club = await getClubById(clubId);
  if (!club) {
    await logAdminValidationRejection({
      adminContext,
      actionType: AdminAuditActionCodes.ADMIN_EXTEND_SUBSCRIPTION_REJECTED,
      target: { type: 'club', id: clubId },
      reason: 'Attempted to extend subscription for non-existent club',
      errorCode: 'CLUB_NOT_FOUND',
    });
    throw new Error(`Club not found: ${clubId}`);
  }
  
  // 5. Validate subscription exists
  const subscription = await getClubSubscription(clubId);
  if (!subscription) {
    await logAdminValidationRejection({
      adminContext,
      actionType: AdminAuditActionCodes.ADMIN_EXTEND_SUBSCRIPTION_REJECTED,
      target: { type: 'club', id: clubId },
      reason: 'Attempted to extend subscription for club without subscription',
      errorCode: 'SUBSCRIPTION_NOT_FOUND',
      metadata: { clubName: club.name },
    });
    throw new Error(`No subscription found for club: ${clubId}`);
  }
  
  // 6. Validate subscription state is eligible
  if (!isEligibleState(subscription.status)) {
    await logAdminValidationRejection({
      adminContext,
      actionType: AdminAuditActionCodes.ADMIN_EXTEND_SUBSCRIPTION_REJECTED,
      target: { type: 'club', id: clubId },
      reason: `Subscription state '${subscription.status}' is not eligible for extension`,
      errorCode: 'INELIGIBLE_STATE',
      metadata: {
        currentState: subscription.status,
        eligibleStates: ELIGIBLE_STATES,
        clubName: club.name,
      },
    });
    throw new Error(
      `Subscription state '${subscription.status}' is not eligible for extension. ` +
      `Eligible states: ${ELIGIBLE_STATES.join(', ')}`
    );
  }
  
  log.info('[AdminExtendSubscription] Validation passed, executing atomic mutation', {
    clubId,
    days,
    currentStatus: subscription.status,
    currentExpiresAt: subscription.currentPeriodEnd,
    actorId: adminContext.actorId,
  });
  
  // === CALCULATE NEW EXPIRATION ===
  
  // Use currentPeriodEnd as the base for extension
  const previousExpiresAt = subscription.currentPeriodEnd;
  const newExpiresAt = calculateNewExpiresAt(previousExpiresAt, days);
  
  // === ATOMIC MUTATION ===
  
  const result = await adminAtomicMutation<ClubSubscription>({
    adminContext,
    actionType: AdminAuditActionCodes.ADMIN_EXTEND_SUBSCRIPTION,
    target: { type: 'club', id: clubId },
    reason,
    metadata: {
      clubName: club.name,
      planId: subscription.planId,
      currentStatus: subscription.status,
      previousExpiresAt,
      newExpiresAt,
      daysExtended: days,
    },
    
    mutation: async () => {
      // Update ONLY expires_at (SSOT §4.1)
      const updatedSubscription = await updateSubscriptionExpiresAt(clubId, newExpiresAt);
      
      return {
        data: updatedSubscription,
        relatedEntityId: clubId, // Club ID as related entity for this operation
      };
    },
    
    rollback: async () => {
      // Revert expires_at to previous value
      try {
        await revertSubscriptionExpiresAt(clubId, previousExpiresAt);
        log.info('[AdminExtendSubscription] Rollback: reverted expires_at', {
          clubId,
          revertedTo: previousExpiresAt,
        });
      } catch (e) {
        log.error('[AdminExtendSubscription] Rollback: failed to revert expires_at', {
          clubId,
          previousExpiresAt,
          error: e instanceof Error ? e.message : 'Unknown',
        });
      }
    },
  });
  
  log.info('[AdminExtendSubscription] Subscription extended successfully', {
    clubId,
    daysExtended: days,
    previousExpiresAt,
    newExpiresAt,
    status: result.data.status, // Confirm status unchanged
    planId: result.data.planId, // Confirm plan unchanged
    auditId: result.auditRecord.id,
  });
  
  return {
    subscription: result.data,
    previousExpiresAt,
    newExpiresAt,
    auditRecord: result.auditRecord,
  };
}
