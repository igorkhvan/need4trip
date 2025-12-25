/**
 * Billing Transactions Repository v2.0
 * 
 * Database operations for billing_transactions table (audit trail)
 * Source: docs/BILLING_AND_LIMITS.md
 */

import { supabaseAdmin, ensureAdminClient } from "./client";
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
  amount_kzt: number;
  currency: string;
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
    amountKzt: Number(db.amount_kzt),
    currency: db.currency,
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
  amountKzt: number;
  periodStart?: string;
  periodEnd?: string;
}): Promise<BillingTransaction> {
  ensureAdminClient();
  if (!supabaseAdmin) {
    throw new InternalError("Supabase client is not configured");
  }

  const dbData = {
    club_id: params.clubId,
    plan_id: params.planId,
    user_id: null,  // Legacy: club transactions don't have user_id
    product_code: `CLUB_${params.planId.toUpperCase()}` as any,  // Infer from plan_id
    provider: params.provider,
    provider_payment_id: params.providerPaymentId ?? null,
    amount_kzt: params.amountKzt,
    currency: 'KZT',
    status: 'pending',
    period_start: params.periodStart ?? null,
    period_end: params.periodEnd ?? null,
  };

  const { data, error } = await supabaseAdmin
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
 * Mark transaction as paid
 */
export async function markTransactionPaid(
  transactionId: string,
  providerPaymentId?: string
): Promise<void> {
  ensureAdminClient();
  if (!supabaseAdmin) {
    throw new InternalError("Supabase client is not configured");
  }

  const updates: Record<string, unknown> = {
    status: 'paid',
    updated_at: new Date().toISOString(),
  };

  if (providerPaymentId) {
    updates.provider_payment_id = providerPaymentId;
  }

  const { error } = await supabaseAdmin
    .from('billing_transactions')
    .update(updates)
    .eq('id', transactionId);

  if (error) {
    log.error("Failed to mark transaction as paid", { transactionId, error });
    throw new InternalError("Failed to mark transaction as paid", error);
  }
}

/**
 * Mark transaction as failed
 */
export async function markTransactionFailed(transactionId: string): Promise<void> {
  ensureAdminClient();
  if (!supabaseAdmin) {
    throw new InternalError("Supabase client is not configured");
  }

  const { error } = await supabaseAdmin
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
  ensureAdminClient();
  if (!supabaseAdmin) return [];

  const { data, error } = await supabaseAdmin
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
