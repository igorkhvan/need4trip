/**
 * Settlement Orchestrator (Phase P1.1)
 * 
 * Purpose: Centralize settlement logic to eliminate duplication between:
 * - DEV settle endpoint (/api/dev/billing/settle)
 * - Production webhook endpoint (/api/billing/webhook)
 * 
 * Settlement semantics (MUST match P0 phases):
 * - One-off credit: createBillingCredit() with source_transaction_id
 * - Club subscription: activateSubscription() with 30-day REPLACE semantics
 * - Idempotency: handled via source_transaction_id UNIQUE constraint (credits)
 *   and upsert on club_id (subscriptions)
 * 
 * Ref: docs/phase/p0/PHASE_P0_1_SUBSCRIPTION_SETTLEMENT_IMPLEMENTATION.md
 * Ref: docs/phase/p0/PHASE_P0_2_WEBHOOK_ENTRYPOINT_SKELETON.md
 * 
 * SCOPE: Foundation only. Behavior MUST remain identical to existing.
 */

import "server-only";
import { createBillingCredit } from "@/lib/db/billingCreditsRepo";
import { activateSubscription } from "@/lib/db/clubSubscriptionRepo";
import { logger } from "@/lib/utils/logger";
import type { BillingTransaction, PlanId } from "@/lib/types/billing";

// ============================================================================
// Types
// ============================================================================

/**
 * Settlement result
 */
export interface SettlementResult {
  /** Whether settlement was performed (false if idempotent skip) */
  settled: boolean;
  
  /** Type of entitlement issued */
  entitlementType: 'credit' | 'subscription' | 'none';
  
  /** ID of issued entitlement (creditId or subscriptionId) */
  entitlementId?: string;
  
  /** Whether this was an idempotent no-op (already settled) */
  idempotentSkip: boolean;
}

/**
 * Settlement context (for logging)
 */
interface SettlementContext {
  /** Caller identifier for logging */
  caller: 'webhook' | 'dev_settle';
}

// ============================================================================
// Settlement Constants
// ============================================================================

/**
 * Subscription period duration (30 days in milliseconds)
 * 
 * Per ARCHITECT decision: REPLACE semantics, 30-day period
 * Ref: docs/phase/p0/PHASE_P0_1_SUBSCRIPTION_SETTLEMENT_IMPLEMENTATION.md §6
 */
const SUBSCRIPTION_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

// ============================================================================
// Settlement Orchestrator
// ============================================================================

/**
 * Settle a completed transaction by issuing entitlements
 * 
 * This function handles:
 * 1. One-off credits (EVENT_UPGRADE_500) → createBillingCredit()
 * 2. Club subscriptions (CLUB_*) → activateSubscription()
 * 
 * Idempotency is guaranteed:
 * - Credits: source_transaction_id UNIQUE constraint catches duplicates
 * - Subscriptions: upsert on club_id replaces existing
 * 
 * @param transaction - The transaction to settle (MUST have status='completed' already set)
 * @param originalStatus - The transaction status BEFORE it was updated to 'completed'
 *                         Used for subscription idempotency check
 * @param context - Settlement context for logging
 * @returns Settlement result
 */
export async function settleTransaction(
  transaction: BillingTransaction,
  originalStatus: string,
  context: SettlementContext
): Promise<SettlementResult> {
  const isOneOff = transaction.productCode === "EVENT_UPGRADE_500";
  const isClubSubscription = transaction.clubId && transaction.planId;
  
  // One-off credit settlement
  if (isOneOff && transaction.userId) {
    return settleOneOffCredit(transaction, context);
  }
  
  // Club subscription settlement
  if (isClubSubscription) {
    return settleClubSubscription(transaction, originalStatus, context);
  }
  
  // No entitlement to issue (edge case - should not happen with valid transactions)
  logger.warn(`${context.caller}: No entitlement issued for transaction`, {
    transactionId: transaction.id,
    productCode: transaction.productCode,
  });
  
  return {
    settled: false,
    entitlementType: 'none',
    idempotentSkip: false,
  };
}

// ============================================================================
// One-Off Credit Settlement
// ============================================================================

/**
 * Settle a one-off credit transaction
 * 
 * Creates a billing credit with status='available'.
 * Idempotency via source_transaction_id UNIQUE constraint.
 */
async function settleOneOffCredit(
  transaction: BillingTransaction,
  context: SettlementContext
): Promise<SettlementResult> {
  try {
    const credit = await createBillingCredit({
      userId: transaction.userId!,
      creditCode: transaction.productCode as "EVENT_UPGRADE_500",
      sourceTransactionId: transaction.id,
    });
    
    logger.info(`${context.caller}: Credit issued`, {
      transactionId: transaction.id,
      creditId: credit.id,
      userId: transaction.userId,
    });
    
    return {
      settled: true,
      entitlementType: 'credit',
      entitlementId: credit.id,
      idempotentSkip: false,
    };
    
  } catch (error: unknown) {
    // Idempotency: source_transaction_id UNIQUE constraint catches duplicates
    const err = error as { message?: string; code?: string };
    if (err.message?.includes("duplicate") || err.code === "23505") {
      logger.info(`${context.caller}: Credit already issued (idempotent)`, {
        transactionId: transaction.id,
      });
      
      return {
        settled: false,
        entitlementType: 'credit',
        idempotentSkip: true,
      };
    }
    
    // Re-throw unexpected errors
    throw error;
  }
}

// ============================================================================
// Club Subscription Settlement
// ============================================================================

/**
 * Settle a club subscription transaction
 * 
 * Activates subscription with 30-day REPLACE semantics.
 * Idempotency via upsert on club_id.
 * 
 * @param transaction - The transaction to settle
 * @param originalStatus - The transaction status BEFORE update to 'completed'
 *                         Used for idempotency check (skip if was already 'completed')
 */
async function settleClubSubscription(
  transaction: BillingTransaction,
  originalStatus: string,
  context: SettlementContext
): Promise<SettlementResult> {
  // Idempotency: if transaction was already completed, skip
  // (The status was already 'completed' before this settlement attempt)
  if (originalStatus === 'completed') {
    logger.info(`${context.caller}: Subscription settlement skipped (idempotent - already completed)`, {
      transactionId: transaction.id,
      clubId: transaction.clubId,
      planId: transaction.planId,
    });
    
    return {
      settled: false,
      entitlementType: 'subscription',
      idempotentSkip: true,
    };
  }
  
  // Calculate period: NOW → NOW + 30 days (REPLACE semantics)
  const periodStart = new Date().toISOString();
  const periodEnd = new Date(Date.now() + SUBSCRIPTION_PERIOD_MS).toISOString();
  
  // Activate subscription via repo (upsert with onConflict: 'club_id')
  // graceUntil = NULL per ARCHITECT decision (admin extension logic OUT OF SCOPE)
  const subscription = await activateSubscription(
    transaction.clubId!,
    transaction.planId as PlanId,
    periodStart,
    periodEnd,
    null // graceUntil
  );
  
  logger.info(`${context.caller}: Subscription activated`, {
    transactionId: transaction.id,
    clubId: transaction.clubId,
    planId: transaction.planId,
    periodStart,
    periodEnd,
    subscriptionStatus: subscription.status,
  });
  
  return {
    settled: true,
    entitlementType: 'subscription',
    entitlementId: subscription.clubId, // ClubSubscription uses clubId as identifier
    idempotentSkip: false,
  };
}
