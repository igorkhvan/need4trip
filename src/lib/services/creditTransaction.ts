/**
 * Credit Transaction Service
 * 
 * Handles atomic consumption of one-off credits with event creation/update.
 * Implements compensating transaction pattern (rollback on failure).
 * 
 * Architecture:
 * 1. Consume credit first (mark as consumed)
 * 2. Try to save event
 * 3. If event save fails → rollback credit (mark as available)
 * 4. If rollback fails → log error for manual intervention
 */

import { consumeCredit } from "@/lib/db/billingCreditsRepo";
import { getAdminDb } from "@/lib/db/client";
import { log } from "@/lib/utils/logger";

/**
 * Result of atomic credit transaction
 */
export interface CreditTransactionResult {
  success: boolean;
  creditConsumed: boolean;
  creditId?: string;
  error?: Error;
}

/**
 * Execute operation with credit consumption in compensating transaction
 * 
 * Pattern:
 * 1. Mark credit as consumed (optimistic lock)
 * 2. Execute operation (save event)
 * 3. If operation fails → rollback credit (mark as available)
 * 
 * @param userId User ID
 * @param creditCode Credit code to consume
 * @param eventId Event ID for tracking
 * @param operation Async operation to execute (e.g., save event)
 * @returns Transaction result
 */
export async function executeWithCreditTransaction<T>(
  userId: string,
  creditCode: "EVENT_UPGRADE_500",
  eventId: string | undefined,
  operation: () => Promise<T>
): Promise<T> {
  let consumedCreditId: string | undefined;
  
  try {
    // Step 1: Consume credit (mark as consumed)
    log.info("[CreditTransaction] Consuming credit", { userId, creditCode, eventId });
    
    const credit = await consumeCredit(userId, creditCode, eventId ?? "pending");
    consumedCreditId = credit.id;
    
    log.info("[CreditTransaction] Credit consumed", { 
      creditId: credit.id, 
      userId, 
      creditCode, 
      eventId 
    });
    
    // Step 2: Execute operation (e.g., save event)
    log.info("[CreditTransaction] Executing operation", { eventId });
    
    const result = await operation();
    
    log.info("[CreditTransaction] Operation succeeded", { eventId });
    
    return result;
    
  } catch (operationError: any) {
    // Step 3: Operation failed → rollback credit
    log.error("[CreditTransaction] Operation failed, attempting rollback", { 
      error: operationError.message,
      creditId: consumedCreditId,
      eventId 
    });
    
    if (consumedCreditId) {
      try {
        await rollbackCredit(consumedCreditId);
        
        log.info("[CreditTransaction] Credit rollback successful", { 
          creditId: consumedCreditId 
        });
      } catch (rollbackError: any) {
        // CRITICAL: Rollback failed - requires manual intervention
        log.error("[CreditTransaction] CRITICAL: Credit rollback failed", {
          creditId: consumedCreditId,
          rollbackError: rollbackError.message,
          originalError: operationError.message,
          eventId,
          userId,
          // This should trigger alerts in production
          severity: "CRITICAL",
          requiresManualIntervention: true,
        });
        
        // Still throw original error to user
        // Admin will need to manually fix credit in DB
      }
    }
    
    // Re-throw original operation error
    throw operationError;
  }
}

/**
 * Rollback consumed credit (mark as available again)
 * 
 * @param creditId Credit ID to rollback
 */
async function rollbackCredit(creditId: string): Promise<void> {
  const db = getAdminDb();
  
  const { error } = await db
    .from("billing_credits")
    .update({
      status: "available",
      consumed_event_id: null,
      consumed_at: null,
    })
    .eq("id", creditId)
    .eq("status", "consumed"); // Only rollback if still consumed
  
  if (error) {
    throw new Error(`Failed to rollback credit: ${error.message}`);
  }
}

/**
 * Check if credit is available before starting transaction
 * (Optional pre-check to avoid consuming credit if operation will likely fail)
 * 
 * @param userId User ID
 * @param creditCode Credit code
 * @returns true if credit available
 */
export async function isCreditAvailable(
  userId: string,
  creditCode: "EVENT_UPGRADE_500"
): Promise<boolean> {
  const db = getAdminDb();
  
  const { count, error } = await db
    .from("billing_credits")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("credit_code", creditCode)
    .eq("status", "available");
  
  if (error) {
    log.error("Failed to check credit availability", { error, userId, creditCode });
    return false;
  }
  
  return (count ?? 0) > 0;
}

