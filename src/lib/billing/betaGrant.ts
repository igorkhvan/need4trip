/**
 * Beta System Auto-Grant Service
 *
 * Grants exactly one billing credit with source='system' for SOFT_BETA_STRICT mode.
 * Follows the admin-grant pattern from adminGrantOneOffCredit.ts.
 *
 * BEHAVIOR:
 * 1. Validate PAYWALL_MODE === 'soft_beta_strict'
 * 2. Create billing_transactions record (provider='system-beta-grant', amount=0)
 * 3. Create billing_credits record (source='system', status='available')
 * 4. Emit BETA_BILLING_AUTO_GRANT telemetry
 *
 * HARD GUARDS:
 * - MUST check PAYWALL_MODE before granting
 * - MUST create billing_transactions record (FK requirement)
 * - MUST NOT bypass billing enforcement
 * - MUST NOT auto-consume credit (consumption via standard path)
 *
 * @see BETA_SOFT_STRICT_DELTA_REPORT.md §3.2
 * @see adminGrantOneOffCredit.ts (pattern reference)
 */

import 'server-only';

import { getAdminDb } from '@/lib/db/client';
import { createBillingCredit } from '@/lib/db/billingCreditsRepo';
import { isSoftBetaStrict } from '@/lib/config/paywall';
import { emitBetaTelemetry, BETA_TELEMETRY_EVENTS } from '@/lib/telemetry/beta';
import { log } from '@/lib/utils/logger';
import type { BillingCredit, CreditCode, CreditSource } from '@/lib/types/billing';

// ============================================================================
// Types
// ============================================================================

export interface BetaGrantParams {
  userId: string;
  creditCode: CreditCode;
  reason: string;
}

export interface BetaGrantResult {
  credit: BillingCredit;
  transactionId: string;
}

// ============================================================================
// Service Function
// ============================================================================

/**
 * System auto-grant one billing credit for beta.
 *
 * Follows the same transaction + credit pattern as admin-grant,
 * but with source='system' and provider='system-beta-grant'.
 *
 * @throws Error if PAYWALL_MODE is not soft_beta_strict
 * @throws Error if transaction or credit creation fails
 */
export async function betaGrantOneOffCredit(
  params: BetaGrantParams
): Promise<BetaGrantResult> {
  const { userId, creditCode, reason } = params;

  // === GUARD: Mode check ===
  if (!isSoftBetaStrict()) {
    log.error('[BetaGrant] Attempted system grant outside SOFT_BETA_STRICT mode', {
      userId,
      creditCode,
    });
    throw new Error('System auto-grant is only available in SOFT_BETA_STRICT mode');
  }

  log.info('[BetaGrant] Starting system auto-grant', {
    userId,
    creditCode,
    reason,
  });

  // === Step 1: Create billing_transactions record ===
  // Follows admin-grant pattern: non-financial marker transaction
  const db = getAdminDb();

  const { data: txData, error: txError } = await db
    .from('billing_transactions')
    .insert({
      user_id: userId,
      club_id: null,
      plan_id: null,
      product_code: creditCode,
      provider: 'system-beta-grant',
      provider_payment_id: null,
      amount: 0,
      currency_code: 'KZT',
      status: 'completed',
      period_start: null,
      period_end: null,
    })
    .select('id')
    .single();

  if (txError || !txData) {
    log.error('[BetaGrant] Failed to create system transaction', {
      userId,
      creditCode,
      error: txError,
    });
    throw new Error(`Failed to create system transaction: ${txError?.message ?? 'Unknown error'}`);
  }

  const transactionId = txData.id;

  // === Step 2: Create billing_credits record ===
  let credit: BillingCredit;
  try {
    credit = await createBillingCredit({
      userId,
      creditCode,
      sourceTransactionId: transactionId,
      source: 'system' as CreditSource,
    });
  } catch (creditError) {
    // Rollback transaction on credit creation failure
    log.error('[BetaGrant] Failed to create credit, rolling back transaction', {
      transactionId,
      userId,
      creditCode,
      error: creditError,
    });

    await db
      .from('billing_transactions')
      .delete()
      .eq('id', transactionId);

    throw creditError;
  }

  // === Step 3: Emit telemetry ===
  emitBetaTelemetry(BETA_TELEMETRY_EVENTS.BETA_BILLING_AUTO_GRANT, {
    userId,
    creditCode,
    creditId: credit.id,
    transactionId,
    reason,
  });

  log.info('[BetaGrant] System credit granted successfully', {
    creditId: credit.id,
    transactionId,
    userId,
    creditCode,
    source: 'system',
  });

  return {
    credit,
    transactionId,
  };
}
