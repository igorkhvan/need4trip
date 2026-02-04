/**
 * Billing Transactions Repository v2.0
 * 
 * Database operations for billing_transactions table (audit trail)
 * Source: docs/BILLING_AND_LIMITS.md
 */

import { getAdminDb } from "./client";
import type { BillingTransaction, TransactionStatus, PlanId } from "@/lib/types/billing";
import { InternalError } from "@/lib/errors";
import { log } from "@/lib/utils/logger";

// ============================================================================
// Database Types
// ============================================================================

interface DbBillingTransaction {
  id: string;
  club_id: string | null;  // Nullable for one-off credits
  plan_id: string | null;  // Nullable for one-off credits
  user_id: string | null;  // For one-off credits
  product_code: string;    // NEW
  provider: string;
  provider_payment_id: string | null;
  amount: number;          // ⚡ Normalized (was amount_kzt)
  currency_code: string;   // ⚡ Normalized with FK (was currency)
  status: string;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Mappers
// ============================================================================

function mapDbTransactionToDomain(db: DbBillingTransaction): BillingTransaction {
  return {
    id: db.id,
    clubId: db.club_id,
    planId: db.plan_id as PlanId | null,
    userId: db.user_id,
    productCode: db.product_code as any,  // Type assertion for ProductCode
    provider: db.provider,
    providerPaymentId: db.provider_payment_id,
    amount: Number(db.amount),           // ⚡ Normalized
    currencyCode: db.currency_code,      // ⚡ Normalized
    status: db.status as TransactionStatus,
    periodStart: db.period_start,
    periodEnd: db.period_end,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

// ============================================================================
// Repository Functions
// ============================================================================

/**
 * Create pending transaction
 */
export async function createPendingTransaction(params: {
  clubId: string;
  planId: PlanId;
  provider: string;
  providerPaymentId?: string;
  amount: number;          // ⚡ Normalized parameter name
  currencyCode?: string;   // ⚡ Normalized (optional, defaults to KZT)
  periodStart?: string;
  periodEnd?: string;
}): Promise<BillingTransaction> {
  const db = getAdminDb();

  const dbData = {
    club_id: params.clubId,
    plan_id: params.planId,
    user_id: null,  // Legacy: club transactions don't have user_id
    product_code: `CLUB_${params.planId.toUpperCase()}` as any,  // Infer from plan_id
    provider: params.provider,
    provider_payment_id: params.providerPaymentId ?? null,
    amount: params.amount,                        // ⚡ Normalized
    currency_code: params.currencyCode ?? 'KZT', // ⚡ Normalized with FK
    status: 'pending',
    period_start: params.periodStart ?? null,
    period_end: params.periodEnd ?? null,
  };

  const { data, error } = await db
    .from('billing_transactions')
    .insert(dbData)
    .select()
    .single();

  if (error || !data) {
    log.error("Failed to create pending transaction", { params, error });
    throw new InternalError("Failed to create pending transaction", error);
  }

  return mapDbTransactionToDomain(data as DbBillingTransaction);
}

/**
 * Mark transaction as completed
 * 
 * Note: Renamed from markTransactionPaid (P1.0 fix - INC-003)
 * DB CHECK constraint requires 'completed', not 'paid'.
 */
export async function markTransactionCompleted(
  transactionId: string,
  providerPaymentId?: string
): Promise<void> {
  const db = getAdminDb();

  const updates: Record<string, unknown> = {
    status: 'completed',
    updated_at: new Date().toISOString(),
  };

  if (providerPaymentId) {
    updates.provider_payment_id = providerPaymentId;
  }

  const { error } = await db
    .from('billing_transactions')
    .update(updates)
    .eq('id', transactionId);

  if (error) {
    log.error("Failed to mark transaction as completed", { transactionId, error });
    throw new InternalError("Failed to mark transaction as completed", error);
  }
}

/**
 * Mark transaction as failed
 */
export async function markTransactionFailed(transactionId: string): Promise<void> {
  const db = getAdminDb();

  const { error } = await db
    .from('billing_transactions')
    .update({
      status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', transactionId);

  if (error) {
    log.error("Failed to mark transaction as failed", { transactionId, error });
    throw new InternalError("Failed to mark transaction as failed", error);
  }
}

/**
 * Get club transactions (for history/audit)
 */
export async function getClubTransactions(
  clubId: string,
  limit: number = 50
): Promise<BillingTransaction[]> {
  const db = getAdminDb();

  const { data, error } = await db
    .from('billing_transactions')
    .select('*')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    log.error("Failed to get club transactions", { clubId, error });
    throw new InternalError("Failed to get club transactions", error);
  }

  return (data as DbBillingTransaction[]).map(mapDbTransactionToDomain);
}

/**
 * Get transaction by provider payment ID (for webhook processing)
 * PHASE_P0_2: Added to support webhook entrypoint
 */
export async function getTransactionByProviderPaymentId(
  providerPaymentId: string
): Promise<BillingTransaction | null> {
  const db = getAdminDb();

  const { data, error } = await db
    .from('billing_transactions')
    .select('*')
    .eq('provider_payment_id', providerPaymentId)
    .single();

  if (error) {
    // PGRST116 = "Row not found" - expected when no match
    if (error.code === 'PGRST116') {
      return null;
    }
    log.error("Failed to get transaction by provider_payment_id", { providerPaymentId, error });
    throw new InternalError("Failed to get transaction by provider_payment_id", error);
  }

  if (!data) {
    return null;
  }

  return mapDbTransactionToDomain(data as DbBillingTransaction);
}
