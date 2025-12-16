/**
 * Access Control Service v2.0
 * 
 * Centralized enforcement of billing limits and permissions.
 * Throws PaywallError when action is not allowed.
 * 
 * Source: docs/BILLING_AND_LIMITS.md
 */

import { PaywallError } from "@/lib/errors";
import { getClubSubscription } from "@/lib/db/clubSubscriptionRepo";
import { 
  getPlanById,
  getRequiredPlanForParticipants,
  getRequiredPlanForMembers 
} from "@/lib/db/planRepo";
import { isActionAllowed } from "@/lib/db/billingPolicyRepo";
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
 * 2. If Free: check FREE_LIMITS hardcoded
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
