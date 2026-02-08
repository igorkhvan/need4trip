/**
 * Credit Transaction Service
 * 
 * Handles atomic consumption of one-off credits with event creation/update.
 * Implements SSOT-compliant compensating transaction pattern.
 * 
 * CRITICAL SSOT COMPLIANCE (SSOT_CLUBS_EVENTS_ACCESS.md §10.1.2):
 * "Consumption requires a persisted eventId"
 * "Consuming a credit for a 'future' or 'hypothetical' event is FORBIDDEN"
 * 
 * Architecture (SSOT-correct order):
 * 1. Execute operation FIRST (create event, get eventId)
 * 2. Consume credit with ACTUAL eventId (satisfies DB constraint)
 * 3. If credit consumption fails → delete event (compensating rollback)
 * 
 * Constraint being satisfied: chk_billing_credits_consumed_state
 * - status='consumed' requires consumed_event_id IS NOT NULL
 */

import { consumeCredit } from "@/lib/db/billingCreditsRepo";
import { getAdminDb } from "@/lib/db/client";
import { log } from "@/lib/utils/logger";
import { isPaywallError } from "@/lib/errors";

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
 * SSOT-COMPLIANT Pattern (SSOT_CLUBS_EVENTS_ACCESS.md §10.1.2):
 * 1. Execute operation FIRST (create event, get actual eventId)
 * 2. Consume credit with ACTUAL eventId (NOT NULL - satisfies constraint)
 * 3. If credit consumption fails → delete event (compensating rollback)
 * 
 * This order ensures chk_billing_credits_consumed_state is never violated:
 * - consumed_event_id will ALWAYS be a valid UUID when status='consumed'
 * 
 * @param userId User ID
 * @param creditCode Credit code to consume
 * @param eventId Event ID for tracking (undefined for new events)
 * @param operation Async operation to execute (e.g., save event)
 * @returns Transaction result
 */
export async function executeWithCreditTransaction<T extends { id: string }>(
  userId: string,
  creditCode: "EVENT_UPGRADE_500",
  eventId: string | undefined,
  operation: () => Promise<T>
): Promise<T> {
  let createdEventId: string | undefined;
  
  try {
    // Step 1: Execute operation FIRST (create event, get eventId)
    // SSOT §10.1.2: "The event is persisted as part of the save operation"
    log.info("[CreditTransaction] Executing operation first", { userId, creditCode, eventId });
    
    const result = await operation();
    createdEventId = result.id;
    
    log.info("[CreditTransaction] Operation succeeded, got eventId", { 
      eventId: createdEventId 
    });
    
    // Step 2: Consume credit with ACTUAL eventId (MUST NOT be NULL)
    // SSOT §10.1.2: "consumed_event_id MUST be set to the actual event UUID at consumption time"
    const actualEventId = eventId ?? createdEventId;
    
    if (!actualEventId) {
      throw new Error("SSOT violation: Cannot consume credit without eventId");
    }
    
    log.info("[CreditTransaction] Consuming credit with eventId", { 
      userId, 
      creditCode, 
      eventId: actualEventId 
    });
    
    const credit = await consumeCredit(userId, creditCode, actualEventId);
    
    log.info("[CreditTransaction] Credit consumed successfully", { 
      creditId: credit.id, 
      userId, 
      creditCode, 
      eventId: actualEventId 
    });
    
    return result;
    
  } catch (error: any) {
    // Step 3: If anything failed after event creation → rollback (delete event)
    const isPaywall = isPaywallError(error);
    
    log.error("[CreditTransaction] Operation or credit consumption failed", { 
      error: error.message,
      isPaywallError: isPaywall,
      createdEventId,
      eventId,
      userId
    });
    
    // Only rollback (delete) if we created a NEW event (eventId was undefined)
    // For existing events (update flow), we don't delete
    if (createdEventId && !eventId) {
      try {
        await deleteEventForRollback(createdEventId);
        
        log.info("[CreditTransaction] Event rollback successful (deleted)", { 
          eventId: createdEventId 
        });
      } catch (rollbackError: any) {
        // CRITICAL: Rollback failed - requires manual intervention
        // Event exists but credit was not consumed
        log.error("[CreditTransaction] CRITICAL: Event deletion rollback failed", {
          eventId: createdEventId,
          rollbackError: rollbackError.message,
          originalError: error.message,
          userId,
          // This should trigger alerts in production
          severity: "CRITICAL",
          requiresManualIntervention: true,
        });
        
        // Still throw original error to user
        // Admin will need to manually fix event in DB
      }
    }
    
    // Re-throw original error (PaywallError will be handled properly by API layer → 402)
    throw error;
  }
}

/**
 * Delete event for rollback (compensating transaction)
 * 
 * Called when credit consumption fails after event creation.
 * SSOT §10.1.2: Credit binding is atomic with event save; if binding fails, event must be deleted.
 * 
 * @param eventId Event ID to delete
 */
async function deleteEventForRollback(eventId: string): Promise<void> {
  const db = getAdminDb();
  
  // Delete event and all related data (cascade handles locations, brands, access)
  const { error } = await db
    .from("events")
    .delete()
    .eq("id", eventId);
  
  if (error) {
    throw new Error(`Failed to delete event for rollback: ${error.message}`);
  }
  
  log.info("[CreditTransaction] Event deleted for rollback", { eventId });
}


