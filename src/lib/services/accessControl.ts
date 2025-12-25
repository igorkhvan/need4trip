/**
 * Access Control Service v2.0
 * 
 * Centralized enforcement of billing limits and permissions.
 * Throws PaywallError when action is not allowed.
 * 
 * Source: docs/BILLING_AND_LIMITS.md
 * Updated: 2024-12-25 - Added publish enforcement for one-off credits
 */

import { PaywallError } from "@/lib/errors";
import { getClubSubscription } from "@/lib/db/clubSubscriptionRepo";
import { 
  getPlanById,
  getRequiredPlanForParticipants,
  getRequiredPlanForMembers 
} from "@/lib/db/planRepo";
import { isActionAllowed } from "@/lib/db/billingPolicyRepo";
import { hasAvailableCredit } from "@/lib/db/billingCreditsRepo";
import type { 
  BillingActionCode, 
  ClubSubscription, 
  ClubPlan,
  PlanId 
} from "@/lib/types/billing";
import { log } from "@/lib/utils/logger";

// ============================================================================
// Core Enforcement Function
// ============================================================================

/**
 * Check if club can perform action (throws PaywallError if not)
 * 
 * Algorithm (per docs/BILLING_AND_LIMITS.md):
 * 1. Get club subscription (null = Free)
 * 2. If Free: load plan limits from DB (cached)
 * 3. If paid: check status → billing_policy_actions
 * 4. If "active" → always allowed
 * 5. If "grace"/"pending"/"expired" → check DB rules
 */
export async function enforceClubAction(params: {
  clubId: string;
  action: BillingActionCode;
  context?: {
    eventParticipantsCount?: number;
    clubMembersCount?: number;
    isPaidEvent?: boolean;
  };
}): Promise<void> {
  const { clubId, action, context } = params;

  // 1. Get subscription (null = Free plan)
  const subscription = await getClubSubscription(clubId);

  if (!subscription) {
    // FREE PLAN
    await enforceFreeLimit(action, context);
    return;
  }

  // 2. Get plan details
  const plan = await getPlanById(subscription.planId);

  // 3. Check subscription status
  if (subscription.status === "active") {
    // Active subscription - check plan limits only
    await enforcePlanLimits(plan, action, context);
    return;
  }

  // 4. Non-active status (grace/pending/expired) - check policy + limits
  const isAllowed = await isActionAllowed(subscription.status, action);
  
  if (!isAllowed) {
    throw new PaywallError({
      message: `Action "${action}" not allowed for subscription status "${subscription.status}"`,
      reason: "SUBSCRIPTION_NOT_ACTIVE",
      currentPlanId: subscription.planId,
      meta: { status: subscription.status },
    });
  }

  // Action is allowed by policy, but still check plan limits
  await enforcePlanLimits(plan, action, context);
}

// ============================================================================
// Free Plan Enforcement
// ============================================================================

async function enforceFreeLimit(
  action: BillingActionCode,
  context?: {
    eventParticipantsCount?: number;
    isPaidEvent?: boolean;
  }
): Promise<void> {
  // Load FREE plan from database (cached)
  const freePlan = await getPlanById("free");

  // Check paid events
  if (action === "CLUB_CREATE_PAID_EVENT" || context?.isPaidEvent) {
    if (!freePlan.allowPaidEvents) {
      throw new PaywallError({
        message: "Paid events require Club 50 plan or higher",
        reason: "PAID_EVENTS_NOT_ALLOWED",
        currentPlanId: "free",
        requiredPlanId: "club_50",
      });
    }
  }

  // Check CSV export
  if (action === "CLUB_EXPORT_PARTICIPANTS_CSV") {
    if (!freePlan.allowCsvExport) {
      throw new PaywallError({
        message: "CSV export requires Club 50 plan or higher",
        reason: "CSV_EXPORT_NOT_ALLOWED",
        currentPlanId: "free",
        requiredPlanId: "club_50",
      });
    }
  }

  // Check event participants limit
  if (action === "CLUB_CREATE_EVENT" && context?.eventParticipantsCount) {
    if (freePlan.maxEventParticipants !== null && 
        context.eventParticipantsCount > freePlan.maxEventParticipants) {
      const requiredPlan = await getRequiredPlanForParticipants(context.eventParticipantsCount);
      
      throw new PaywallError({
        message: `Event with ${context.eventParticipantsCount} participants requires ${requiredPlan} plan`,
        reason: "MAX_EVENT_PARTICIPANTS_EXCEEDED",
        currentPlanId: "free",
        requiredPlanId: requiredPlan === "free" ? undefined : requiredPlan as PlanId,
        meta: {
          requested: context.eventParticipantsCount,
          limit: freePlan.maxEventParticipants,
        },
      });
    }
  }
}

// ============================================================================
// Paid Plan Limits Enforcement
// ============================================================================

async function enforcePlanLimits(
  plan: ClubPlan,
  action: BillingActionCode,
  context?: {
    eventParticipantsCount?: number;
    clubMembersCount?: number;
    isPaidEvent?: boolean;
  }
): Promise<void> {
  // Check paid events feature
  if (action === "CLUB_CREATE_PAID_EVENT" || context?.isPaidEvent) {
    if (!plan.allowPaidEvents) {
      throw new PaywallError({
        message: "Paid events not allowed on your plan",
        reason: "PAID_EVENTS_NOT_ALLOWED",
        currentPlanId: plan.id,
        requiredPlanId: "club_50", // Minimum plan that supports paid events
      });
    }
  }

  // Check CSV export feature
  if (action === "CLUB_EXPORT_PARTICIPANTS_CSV") {
    if (!plan.allowCsvExport) {
      throw new PaywallError({
        message: "CSV export not allowed on your plan",
        reason: "CSV_EXPORT_NOT_ALLOWED",
        currentPlanId: plan.id,
        requiredPlanId: "club_50", // Minimum plan that supports CSV
      });
    }
  }

  // Check event participants limit (null = unlimited)
  if (action === "CLUB_CREATE_EVENT" && context?.eventParticipantsCount) {
    if (plan.maxEventParticipants !== null && context.eventParticipantsCount > plan.maxEventParticipants) {
      const requiredPlan = await getRequiredPlanForParticipants(context.eventParticipantsCount);
      
      throw new PaywallError({
        message: `Event with ${context.eventParticipantsCount} participants exceeds your plan limit of ${plan.maxEventParticipants}`,
        reason: "MAX_EVENT_PARTICIPANTS_EXCEEDED",
        currentPlanId: plan.id,
        requiredPlanId: requiredPlan === "free" ? undefined : requiredPlan as PlanId,
        meta: {
          requested: context.eventParticipantsCount,
          limit: plan.maxEventParticipants,
        },
      });
    }
  }

  // Check club members limit (null = unlimited)
  if (action === "CLUB_INVITE_MEMBER" && context?.clubMembersCount) {
    if (plan.maxMembers !== null && context.clubMembersCount >= plan.maxMembers) {
      const requiredPlan = await getRequiredPlanForMembers(context.clubMembersCount + 1);
      
      throw new PaywallError({
        message: `Club has reached maximum members limit (${plan.maxMembers})`,
        reason: "MAX_CLUB_MEMBERS_EXCEEDED",
        currentPlanId: plan.id,
        requiredPlanId: requiredPlan,
        meta: {
          current: context.clubMembersCount,
          limit: plan.maxMembers,
        },
      });
    }
  }
}

// ============================================================================
// Club Creation Check (special case - no existing subscription)
// ============================================================================

/**
 * Check if user can create a club
 * 
 * Per spec: User must have active subscription or be on Free plan.
 * If creating first club - Free is allowed.
 * If user already has clubs - must have paid plan.
 */
export async function enforceClubCreation(params: {
  userId: string;
  existingClubsCount: number;
}): Promise<void> {
  const { existingClubsCount } = params;

  // First club - always allowed (Free plan)
  if (existingClubsCount === 0) {
    return;
  }

  // Additional clubs require paid plan
  // Note: This is simplified logic. Full implementation would:
  // 1. Check user's subscription to ANY club
  // 2. Verify they have organizer role
  // 3. Check if that club's plan allows multiple clubs
  
  // For MVP: Allow multiple clubs (enforce limits at event level)
  log.warn("Club creation enforcement: MVP allows multiple clubs", { userId: params.userId });
}

// ============================================================================
// Publish Enforcement (One-off Event Upgrade) - v4
// ============================================================================

/**
 * Enforce event publish rules (one-off upgrade system v4)
 * 
 * Decision tree (per v4 spec):
 * A) Fits free limits → Publish immediately (NO credit consumption!)
 * B) Exceeds free && max_participants > oneoff_max → 402 PAYWALL (club required)
 * C) Exceeds free && ≤oneoff_max && no credits → 402 PAYWALL (options)
 * D) Exceeds free && ≤oneoff_max && has credits → 409 CREDIT_CONFIRMATION_REQUIRED
 * 
 * @param params Event publish parameters
 * @param confirmCredit User explicitly confirmed credit consumption
 * @returns Decision result
 */
export async function enforcePublish(params: {
  eventId: string;
  userId: string;
  maxParticipants: number | null;
  clubId: string | null;
}, confirmCredit: boolean = false): Promise<PublishDecision> {
  const { maxParticipants, clubId, userId } = params;

  // Step 1: Club events branch (use existing enforcement)
  if (clubId !== null) {
    // Club events never use one-off credits
    // Existing club access control applies
    return { allowed: true };
  }

  // Step 2: Personal events branch
  // Load free plan limits
  const freePlan = await getPlanById("free");
  const freeLimit = freePlan.maxEventParticipants ?? 15; // Default fallback

  // Load one-off constraints from billing_products
  const { getProductByCode } = await import("@/lib/db/billingProductsRepo");
  const oneOffProduct = await getProductByCode("EVENT_UPGRADE_500");
  
  if (!oneOffProduct) {
    log.error("EVENT_UPGRADE_500 product not found in billing_products");
    throw new Error("One-off product configuration missing");
  }

  const oneOffMax = oneOffProduct.constraints.max_participants ?? 500;
  const oneOffPrice = oneOffProduct.priceKzt;

  // Decision A: Fits free limits (CRITICAL: no credit consumption!)
  if (maxParticipants === null || maxParticipants <= freeLimit) {
    return { allowed: true };
  }

  // Decision B: Exceeds oneoff_max (club required)
  if (maxParticipants > oneOffMax) {
    throw new PaywallError({
      message: `Events with more than ${oneOffMax} participants require a club`,
      reason: "CLUB_REQUIRED_FOR_LARGE_EVENT",
      currentPlanId: "free",
      meta: {
        requestedParticipants: maxParticipants,
        maxOneOffLimit: oneOffMax,
      },
      options: [
        {
          type: "CLUB_ACCESS",
          recommendedPlanId: "club_500", // Recommend plan that fits
        },
      ],
    });
  }

  // Decision C/D: Exceeds free but ≤oneoff_max (check credits)
  const hasCredit = await hasAvailableCredit(userId, "EVENT_UPGRADE_500");

  if (!hasCredit) {
    // Decision C: No credits available
    throw new PaywallError({
      message: `Event with ${maxParticipants} participants requires payment`,
      reason: "PUBLISH_REQUIRES_PAYMENT",
      currentPlanId: "free",
      meta: {
        requestedParticipants: maxParticipants,
        freeLimit,
      },
      options: [
        {
          type: "ONE_OFF_CREDIT",
          productCode: "EVENT_UPGRADE_500",
          priceKzt: oneOffPrice, // From billing_products (no hardcode!)
          provider: "kaspi",
        },
        {
          type: "CLUB_ACCESS",
          recommendedPlanId: "club_50",
        },
      ],
    });
  }

  // Decision D: Has credit, needs confirmation
  if (!confirmCredit) {
    return {
      allowed: false,
      requiresCreditConfirmation: true,
      creditCode: "EVENT_UPGRADE_500",
    };
  }

  // Confirmed: proceed with consumption (done in publish route)
  return { allowed: true, willConsumeCredit: true };
}

export type PublishDecision = 
  | { allowed: true; willConsumeCredit?: boolean }
  | { allowed: false; requiresCreditConfirmation: true; creditCode: "EVENT_UPGRADE_500" };

// ============================================================================
// Helper: Get Current Plan for Club
// ============================================================================

/**
 * Get club's current plan (Free if no subscription)
 */
export async function getClubCurrentPlan(clubId: string): Promise<{
  planId: PlanId;
  plan: ClubPlan;
  subscription: ClubSubscription | null;
}> {
  const subscription = await getClubSubscription(clubId);

  if (!subscription) {
    // No subscription = FREE plan (now loaded from DB)
    const freePlan = await getPlanById("free");
    
    return {
      planId: "free",
      plan: freePlan,
      subscription: null,
    };
  }

  const plan = await getPlanById(subscription.planId);

  return {
    planId: subscription.planId,
    plan,
    subscription,
  };
}
