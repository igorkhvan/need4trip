/**
 * Access Control Service v2.0
 * 
 * Centralized enforcement of billing limits and permissions.
 * Throws PaywallError when action is not allowed.
 * 
 * Source: docs/BILLING_AND_LIMITS.md
 * Updated: 2024-12-25 - Added publish enforcement for one-off credits
 * Updated: 2024-12-30 - Added owner-only check for paid club events (SSOT §5.4)
 */

import { PaywallError, AuthError, ValidationError } from "@/lib/errors";
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
// Event Publish Enforcement (CREATE/UPDATE with Monetization) - v5
// ============================================================================

/**
 * Enforce event publish rules for CREATE and UPDATE operations
 * 
 * Unified enforcement for both create and update - checks limits and handles:
 * - Club events: subscription status + plan limits
 * - Personal events: free limits, one-off credits, paywall
 * 
 * Rules (per spec):
 * 
 * CLUB EVENTS (clubId != null):
 * - If subscription expired/policy blocks → 402 PAYWALL (CLUB_ACCESS only)
 * - If limits exceeded → 402 PAYWALL (CLUB_ACCESS only)
 * - Never show one-off credit option
 * 
 * PERSONAL EVENTS (clubId == null):
 * - ≤ free_limit → Allow (no credit, no paywall)
 * - > oneoff_limit → 402 PAYWALL (CLUB_ACCESS only)
 * - free < count ≤ oneoff && no credit → 402 PAYWALL (ONE_OFF + CLUB_ACCESS)
 * - free < count ≤ oneoff && credit && !confirm → 409 CREDIT_CONFIRMATION
 * - free < count ≤ oneoff && credit && confirm → consume credit + allow
 * 
 * @param params Event parameters
 * @param confirmCredit User explicitly confirmed credit consumption
 * @throws PaywallError (402) if payment required
 * @throws CreditConfirmationError (409) if credit confirmation required
 */
export async function enforceEventPublish(params: {
  userId: string;
  clubId: string | null;
  maxParticipants: number | null;
  isPaid: boolean;
  eventId?: string; // For credit consumption tracking (optional for create)
}, confirmCredit: boolean = false): Promise<void> {
  const { userId, clubId, maxParticipants, isPaid, eventId } = params;

  // ============================================================================
  // CLUB EVENTS BRANCH
  // ============================================================================
  if (clubId !== null) {
    // ⚡ SSOT Appendix A4.2: Reject credit params for club events
    // Club events use subscription-based access exclusively (no personal credits)
    if (confirmCredit) {
      throw new ValidationError(
        "Кредиты не применимы к клубным событиям. Клубные события используют подписку клуба."
      );
    }
    
    // Get subscription status
    const subscription = await getClubSubscription(clubId);
    const plan = subscription ? await getPlanById(subscription.planId) : await getPlanById("free");

    // Check 1: Subscription status and policy
    if (subscription && subscription.status !== "active") {
      const isAllowed = await isActionAllowed(subscription.status, "CLUB_CREATE_EVENT");
      
      if (!isAllowed) {
        throw new PaywallError({
          message: `Действие недоступно при статусе подписки "${subscription.status}"`,
          reason: "SUBSCRIPTION_NOT_ACTIVE",
          currentPlanId: subscription.planId,
          meta: { status: subscription.status },
          options: [
            {
              type: "CLUB_ACCESS",
              recommendedPlanId: subscription.planId, // Renew current plan
            },
          ],
        });
      }
    }

    // Check 2: Plan limits for club events
    // Check paid events feature
    if (isPaid && !plan.allowPaidEvents) {
      throw new PaywallError({
        message: "Платные события недоступны на вашем тарифе",
        reason: "PAID_EVENTS_NOT_ALLOWED",
        currentPlanId: plan.id,
        requiredPlanId: "club_50",
        options: [
          {
            type: "CLUB_ACCESS",
            recommendedPlanId: "club_50",
          },
        ],
      });
    }
    
    // ⚡ SSOT §5.4 + Appendix A4.3: Paid club event publish is OWNER-ONLY
    // admin may publish club FREE events, but NOT paid events
    if (isPaid) {
      const { getUserClubRole } = await import("@/lib/db/clubMemberRepo");
      const role = await getUserClubRole(clubId, userId);
      
      if (role !== "owner") {
        throw new AuthError(
          "Только владелец клуба может публиковать платные события. Обратитесь к владельцу клуба.",
          undefined,
          403
        );
      }
    }

    // Check participants limit
    if (maxParticipants !== null && plan.maxEventParticipants !== null && maxParticipants > plan.maxEventParticipants) {
      const requiredPlan = await getRequiredPlanForParticipants(maxParticipants);
      
      throw new PaywallError({
        message: `Событие на ${maxParticipants} участников превышает лимит вашего плана (${plan.maxEventParticipants})`,
        reason: "MAX_EVENT_PARTICIPANTS_EXCEEDED",
        currentPlanId: plan.id,
        requiredPlanId: requiredPlan === "free" ? undefined : requiredPlan as PlanId,
        meta: {
          requested: maxParticipants,
          limit: plan.maxEventParticipants,
        },
        options: [
          {
            type: "CLUB_ACCESS",
            recommendedPlanId: requiredPlan as PlanId,
          },
        ],
      });
    }

    // All checks passed for club event
    return;
  }

  // ============================================================================
  // PERSONAL EVENTS BRANCH
  // ============================================================================
  
  // Load limits from database
  const freePlan = await getPlanById("free");
  const freeLimit = freePlan.maxEventParticipants ?? 15;
  
  const { getProductByCode } = await import("@/lib/db/billingProductsRepo");
  const oneOffProduct = await getProductByCode("EVENT_UPGRADE_500");
  
  if (!oneOffProduct) {
    log.error("EVENT_UPGRADE_500 product not found in billing_products");
    throw new Error("One-off product configuration missing");
  }
  
  const oneOffLimit = oneOffProduct.constraints.max_participants ?? 500;
  const oneOffPrice = oneOffProduct.price;
  const oneOffCurrency = oneOffProduct.currencyCode;

  // Check paid events (personal events cannot be paid)
  if (isPaid && !freePlan.allowPaidEvents) {
    throw new PaywallError({
      message: "Платные события доступны только на платных тарифах",
      reason: "PAID_EVENTS_NOT_ALLOWED",
      currentPlanId: "free",
      requiredPlanId: "club_50",
      options: [
        {
          type: "CLUB_ACCESS",
          recommendedPlanId: "club_50",
        },
      ],
    });
  }

  // Decision 1: Within free limits
  if (maxParticipants === null || maxParticipants <= freeLimit) {
    // Allow without credit consumption
    return;
  }

  // Decision 2: Exceeds one-off limit (> 500)
  if (maxParticipants > oneOffLimit) {
    throw new PaywallError({
      message: `События более ${oneOffLimit} участников требуют клубной подписки`,
      reason: "CLUB_REQUIRED_FOR_LARGE_EVENT",
      currentPlanId: "free",
      meta: {
        requestedParticipants: maxParticipants,
        maxOneOffLimit: oneOffLimit,
      },
      options: [
        {
          type: "CLUB_ACCESS",
          recommendedPlanId: "club_500",
        },
      ],
    });
  }

  // Decision 3-5: Between free and one-off limit (16-500)
  const creditAvailable = await hasAvailableCredit(userId, "EVENT_UPGRADE_500");

  if (!creditAvailable) {
    // Decision 3: No credit available
    throw new PaywallError({
      message: `Событие на ${maxParticipants} участников требует оплаты`,
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
          price: oneOffPrice,
          currencyCode: oneOffCurrency,
          provider: "kaspi",
        },
        {
          type: "CLUB_ACCESS",
          recommendedPlanId: "club_50",
        },
      ],
    });
  }

  // Decision 4: Has credit, but not confirmed
  if (!confirmCredit) {
    // Return 409 - need confirmation
    const error = {
      success: false,
      error: {
        code: "CREDIT_CONFIRMATION_REQUIRED",
        reason: "EVENT_UPGRADE_WILL_BE_CONSUMED",
        meta: {
          creditCode: "EVENT_UPGRADE_500",
          eventId: eventId ?? null,
          requestedParticipants: maxParticipants,
        },
        cta: {
          type: "CONFIRM_CONSUME_CREDIT",
          // CTA href will be set by API endpoint (different for create vs update)
        },
      },
    };
    
    // Throw special error that API layer will convert to 409
    throw new CreditConfirmationRequiredError(error);
  }

  // Decision 5: Confirmed - consume credit atomically
  // Note: Credit consumption happens here, but event save happens later in service layer
  // If event save fails, credit will be rolled back via compensating transaction
  // See: src/lib/services/creditTransaction.ts
  
  // Mark credit as about to be consumed (actual consumption + rollback handled by transaction wrapper)
  log.info("Credit will be consumed for event publish (wrapped in transaction)", {
    userId,
    creditCode: "EVENT_UPGRADE_500",
    eventId: eventId ?? "new",
    maxParticipants,
  });
  
  // NOTE: Do NOT consume credit here!
  // Credit consumption is handled by executeWithCreditTransaction() wrapper
  // in createEvent()/updateEvent() to ensure atomicity
}

/**
 * Special error for credit confirmation required (409)
 * 
 * This is NOT a PaywallError (402) - it's a warning that requires user confirmation
 * before proceeding with credit consumption.
 */
export class CreditConfirmationRequiredError extends Error {
  public readonly payload: any;
  
  constructor(payload: any) {
    super("CREDIT_CONFIRMATION_REQUIRED");
    this.name = "CreditConfirmationRequiredError";
    this.payload = payload;
  }
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
