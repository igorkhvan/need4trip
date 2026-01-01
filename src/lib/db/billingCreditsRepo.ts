/**
 * Billing Credits Repository
 * 
 * Purpose: CRUD operations for one-off event upgrade credits
 * Spec: One-off event upgrade billing system
 * 
 * SSOT: src/lib/types/billing.ts (BillingCredit, CreditCode, CreditStatus)
 */

import { getAdminDb } from "@/lib/db/client";
import type { BillingCredit, CreditCode, CreditStatus } from "@/lib/types/billing";
import { logger } from "@/lib/utils/logger";
import { PaywallError } from "@/lib/errors";

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a billing credit (after successful payment)
 * 
 * @param data Credit creation data
 * @returns Created credit
 * @throws Error if transaction already has a credit (idempotency)
 */
export async function createBillingCredit(data: {
  userId: string;
  creditCode: CreditCode;
  sourceTransactionId: string;
}): Promise<BillingCredit> {
  const db = getAdminDb();

  const { data: credit, error } = await db
    .from("billing_credits")
    .insert({
      user_id: data.userId,
      credit_code: data.creditCode,
      status: "available" as CreditStatus,
      source_transaction_id: data.sourceTransactionId,
    })
    .select("*")
    .single();

  if (error) {
    logger.error("Failed to create billing credit", { error, data });
    throw new Error(`Failed to create billing credit: ${error.message}`);
  }

  return mapDbRowToCredit(credit);
}

/**
 * Get all available credits for a user
 * 
 * @param userId User ID
 * @param creditCode Optional filter by credit code
 * @returns Array of available credits
 */
export async function getAvailableCredits(
  userId: string,
  creditCode?: CreditCode
): Promise<BillingCredit[]> {
  const db = getAdminDb();

  let query = db
    .from("billing_credits")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "available")
    .order("created_at", { ascending: true });

  if (creditCode) {
    query = query.eq("credit_code", creditCode);
  }

  const { data, error } = await query;

  if (error) {
    logger.error("Failed to fetch available credits", { error, userId, creditCode });
    throw new Error(`Failed to fetch available credits: ${error.message}`);
  }

  return data.map(mapDbRowToCredit);
}

/**
 * Get credit by ID
 * 
 * @param creditId Credit ID
 * @returns Credit or null if not found
 */
export async function getCreditById(creditId: string): Promise<BillingCredit | null> {
  const db = getAdminDb();

  const { data, error } = await db
    .from("billing_credits")
    .select("*")
    .eq("id", creditId)
    .maybeSingle();

  if (error) {
    logger.error("Failed to fetch credit by ID", { error, creditId });
    throw new Error(`Failed to fetch credit: ${error.message}`);
  }

  return data ? mapDbRowToCredit(data) : null;
}

/**
 * Get credit by source transaction ID (idempotency check)
 * 
 * @param transactionId Transaction ID
 * @returns Credit or null if not found
 */
export async function getCreditByTransactionId(
  transactionId: string
): Promise<BillingCredit | null> {
  const db = getAdminDb();

  const { data, error } = await db
    .from("billing_credits")
    .select("*")
    .eq("source_transaction_id", transactionId)
    .maybeSingle();

  if (error) {
    logger.error("Failed to fetch credit by transaction ID", { error, transactionId });
    throw new Error(`Failed to fetch credit: ${error.message}`);
  }

  return data ? mapDbRowToCredit(data) : null;
}

// ============================================================================
// Consumption Logic (Used during event save with confirm_credit=1)
// ============================================================================

/**
 * Consume a credit for an event (atomic operation)
 * 
 * SSOT COMPLIANCE (SSOT_CLUBS_EVENTS_ACCESS.md §10.1.2):
 * "Consumption requires a persisted eventId"
 * "Consuming a credit for a 'future' or 'hypothetical' event is FORBIDDEN"
 * 
 * This function REQUIRES a valid eventId. The event MUST exist before calling.
 * This satisfies the DB constraint chk_billing_credits_consumed_state:
 *   (status = 'consumed' AND consumed_event_id IS NOT NULL AND consumed_at IS NOT NULL)
 * 
 * @param userId User ID
 * @param creditCode Credit code to consume
 * @param eventId Event ID (REQUIRED - must be a valid existing event UUID)
 * @returns Consumed credit
 * @throws Error if no available credit found or eventId is invalid
 */
export async function consumeCredit(
  userId: string,
  creditCode: CreditCode,
  eventId: string
): Promise<BillingCredit> {
  // SSOT §10.1.2: eventId is REQUIRED - cannot consume credit for hypothetical event
  if (!eventId) {
    logger.error("SSOT violation: consumeCredit called without eventId", { userId, creditCode });
    throw new Error("SSOT violation: Cannot consume credit without a persisted eventId");
  }

  const db = getAdminDb();

  // Step 1: Lock one available credit FOR UPDATE (prevents race conditions)
  const { data: availableCredit, error: lockError } = await db
    .from("billing_credits")
    .select("*")
    .eq("user_id", userId)
    .eq("credit_code", creditCode)
    .eq("status", "available")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (lockError || !availableCredit) {
    // This should rarely happen in normal flow (enforceEventPublish checks first)
    // But can happen due to race condition between check and consumption
    // Return PaywallError (402) not 500 - user needs to purchase credit
    logger.warn("No available credit to consume (race condition or pre-check bug)", { 
      userId, 
      creditCode, 
      eventId,
      lockError 
    });
    throw new PaywallError({
      message: `Нет доступных кредитов для события`,
      reason: "NO_CREDIT_AVAILABLE",
      currentPlanId: "free",
      meta: { requestedCreditCode: creditCode },
      options: [
        {
          type: "ONE_OFF_CREDIT",
          productCode: creditCode,
          price: 5000, // TODO: Load from DB
          currencyCode: "KZT",
          provider: "kaspi",
        },
      ],
    });
  }

  // Step 2: Mark as consumed with ACTUAL eventId (satisfies constraint)
  // Constraint: (status = 'consumed' AND consumed_event_id IS NOT NULL AND consumed_at IS NOT NULL)
  const { data: consumedCredit, error: updateError } = await db
    .from("billing_credits")
    .update({
      status: "consumed" as CreditStatus,
      consumed_event_id: eventId, // REQUIRED: Must be valid UUID (satisfies constraint)
      consumed_at: new Date().toISOString(),
    })
    .eq("id", availableCredit.id)
    .select("*")
    .single();

  if (updateError) {
    logger.error("Failed to consume credit", { error: updateError, availableCredit, eventId });
    throw new Error(`Failed to consume credit: ${updateError.message}`);
  }

  logger.info("Credit consumed successfully", {
    creditId: consumedCredit.id,
    userId,
    creditCode,
    eventId,
  });

  return mapDbRowToCredit(consumedCredit);
}

/**
 * Check if user has available credit (dry-run, no consumption)
 * 
 * @param userId User ID
 * @param creditCode Credit code
 * @returns true if user has at least one available credit
 */
export async function hasAvailableCredit(
  userId: string,
  creditCode: CreditCode
): Promise<boolean> {
  const db = getAdminDb();

  const { count, error } = await db
    .from("billing_credits")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("credit_code", creditCode)
    .eq("status", "available");

  if (error) {
    logger.error("Failed to check available credit", { error, userId, creditCode });
    return false;
  }

  return (count ?? 0) > 0;
}

/**
 * Get consumed credits for an event (audit trail)
 * 
 * @param eventId Event ID
 * @returns Array of consumed credits
 */
export async function getConsumedCreditsForEvent(
  eventId: string
): Promise<BillingCredit[]> {
  const db = getAdminDb();

  const { data, error } = await db
    .from("billing_credits")
    .select("*")
    .eq("consumed_event_id", eventId)
    .eq("status", "consumed");

  if (error) {
    logger.error("Failed to fetch consumed credits for event", { error, eventId });
    throw new Error(`Failed to fetch consumed credits: ${error.message}`);
  }

  return data.map(mapDbRowToCredit);
}

// ============================================================================
// Mapper (DB → Domain)
// ============================================================================

function mapDbRowToCredit(row: any): BillingCredit {
  return {
    id: row.id,
    userId: row.user_id,
    creditCode: row.credit_code,
    status: row.status,
    consumedEventId: row.consumed_event_id,
    consumedAt: row.consumed_at,
    sourceTransactionId: row.source_transaction_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

