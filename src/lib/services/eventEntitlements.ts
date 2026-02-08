/**
 * Event Entitlements Service
 * 
 * Purpose: Compute effective limits/entitlements for events, considering:
 * - Club subscription plans
 * - Consumed one-off credits (EVENT_UPGRADE_500)
 * - Free plan baseline
 * 
 * CRITICAL: This is the SINGLE SOURCE OF TRUTH for event limits.
 * Both UI hints AND backend enforcement MUST use this.
 * 
 * SSOT: docs/ssot/SSOT_ARCHITECTURE.md § Effective Entitlements Standard
 */

import { getPlanById } from "@/lib/db/planRepo";
import { getClubSubscription } from "@/lib/db/clubSubscriptionRepo";
import { getConsumedCreditsForEvent } from "@/lib/db/billingCreditsRepo";
import { getProductByCode } from "@/lib/db/billingProductsRepo";
import { log } from "@/lib/utils/logger";

/** Sentinel value representing "unlimited" participants (null in DB → this in code) */
const UNLIMITED_PARTICIPANTS = Number.MAX_SAFE_INTEGER;

// ============================================================================
// Types
// ============================================================================

export type PaidMode = 
  | 'free'               // Free plan (limit from club_plans.free)
  | 'personal_credit'    // One-off credit applied (limit from billing_products)
  | 'club_subscription'; // Club subscription (plan-dependent)

export interface EventEntitlements {
  /** Maximum event participants allowed */
  maxEventParticipants: number;
  
  /** How this event is paid for */
  paidMode: PaidMode;
  
  /** Applied credit info (if personal_credit mode) */
  creditApplied?: {
    creditCode: 'EVENT_UPGRADE_500';
    creditId: string;
  };
  
  /** Club plan info (if club_subscription mode) */
  clubPlan?: {
    planId: string;
    planTitle: string;
  };
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Get effective event entitlements
 * 
 * Decision tree:
 * 1. If clubId exists → derive from club subscription/plan
 * 2. If clubId null + eventId exists:
 *    - Check if consumed credit bound to eventId
 *    - If yes → limit from billing_products.constraints (personal_credit mode)
 *    - If no → limit from club_plans.free (free mode)
 * 3. If clubId null + no eventId (new personal event) → limit from club_plans.free (free mode)
 * 
 * @param params Context for computing entitlements
 * @returns EventEntitlements with effective limits
 */
export async function getEffectiveEventEntitlements(params: {
  userId: string;
  eventId?: string;
  clubId?: string | null;
}): Promise<EventEntitlements> {
  const { userId, eventId, clubId } = params;
  
  // ============================================================================
  // BRANCH 1: Club Event
  // ============================================================================
  if (clubId) {
    const subscription = await getClubSubscription(clubId);
    const plan = subscription 
      ? await getPlanById(subscription.planId)
      : await getPlanById('free');
    
    log.debug('Effective entitlements: club event', {
      userId,
      eventId,
      clubId,
      planId: plan.id,
      maxParticipants: plan.maxEventParticipants,
    });
    
    return {
      maxEventParticipants: plan.maxEventParticipants ?? UNLIMITED_PARTICIPANTS,
      paidMode: 'club_subscription',
      clubPlan: {
        planId: plan.id,
        planTitle: plan.title,
      },
    };
  }
  
  // ============================================================================
  // BRANCH 2: Personal Event (clubId null)
  // ============================================================================
  
  // Check if event has consumed credit
  if (eventId) {
    const consumedCredits = await getConsumedCreditsForEvent(eventId);
    const upgradeCredit = consumedCredits.find(c => c.creditCode === 'EVENT_UPGRADE_500');
    
    if (upgradeCredit) {
      // Read upgrade limit from billing_products (SSOT for product constraints)
      const product = await getProductByCode('EVENT_UPGRADE_500');
      const upgradeLimit = product?.constraints?.max_participants ?? 500; // LAST_RESORT_FALLBACK
      
      log.debug('Effective entitlements: personal event with credit', {
        userId,
        eventId,
        creditId: upgradeCredit.id,
        maxParticipants: upgradeLimit,
      });
      
      return {
        maxEventParticipants: upgradeLimit,
        paidMode: 'personal_credit',
        creditApplied: {
          creditCode: 'EVENT_UPGRADE_500',
          creditId: upgradeCredit.id,
        },
      };
    }
  }
  
  // Default: Free plan
  const freePlan = await getPlanById('free');
  
  log.debug('Effective entitlements: personal event (free)', {
    userId,
    eventId: eventId || 'new',
    maxParticipants: freePlan.maxEventParticipants,
  });
  
  return {
    maxEventParticipants: freePlan.maxEventParticipants ?? 15,
    paidMode: 'free',
  };
}


