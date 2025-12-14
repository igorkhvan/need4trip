/**
 * Paywall Service
 * 
 * Service for checking paywall triggers and limitations
 */

import type { CurrentUser } from "@/lib/auth/currentUser";
import type { Club } from "@/lib/types/club";
import type { Event } from "@/lib/types/event";
import type { PaywallTrigger, PaywallCheckContext } from "@/lib/types/paywall";
import { createPaywallTrigger, PAYWALL_REASONS } from "@/lib/types/paywall";
import { getCachedClubPlanLimits } from "@/lib/services/planCache";
import { getMember, countMembersByRole } from "@/lib/db/clubMemberRepo";
import { countClubsByUserId } from "@/lib/db/clubRepo";
import { listEvents } from "@/lib/db/eventRepo";

// ============================================================================
// PAYWALL CHECKS
// ============================================================================

/**
 * Check if action hits a paywall
 * Returns PaywallTrigger if paywall is hit, null otherwise
 */
export async function checkPaywall(
  user: CurrentUser | null,
  action: string,
  context: Partial<PaywallCheckContext> = {}
): Promise<PaywallTrigger | null> {
  if (!user) return null;
  
  switch (action) {
    case 'create_event':
      return await checkEventCreationPaywall(user, context);
    
    case 'create_paid_event':
      return await checkPaidEventPaywall(user, context);
    
    case 'export_csv':
      return await checkCsvExportPaywall(user, context);
    
    case 'telegram_bot_pro':
      return await checkTelegramBotProPaywall(user, context);
    
    case 'create_club':
      return await checkClubCreationPaywall(user);
    
    case 'add_organizer':
      return await checkOrganizerLimitPaywall(user, context);
    
    case 'use_visibility':
      return await checkVisibilityPaywall(user, context);
    
    case 'analytics':
      return await checkAnalyticsPaywall(user, context);
      
    default:
      return null;
  }
}

// ============================================================================
// INDIVIDUAL CHECKS
// ============================================================================

/**
 * Check event creation limit
 */
async function checkEventCreationPaywall(
  user: CurrentUser,
  context: Partial<PaywallCheckContext>
): Promise<PaywallTrigger | null> {
  const { clubId } = context;
  const userPlan = user.plan ?? 'free';
  
  // Personal event
  if (!clubId) {
    if (userPlan === 'pro') return null;
    
    // Count active personal events
    const events = await listEvents();
    const now = new Date();
    const activePersonal = events.filter(
      (e) => 
        e.created_by_user_id === user.id &&
        !e.club_id &&
        new Date(e.date_time) >= now
    );
    
    if (activePersonal.length >= 1) {
      return createPaywallTrigger(
        PAYWALL_REASONS.EVENT_LIMIT,
        'free',
        'pro',
        { current: activePersonal.length, limit: 1 }
      );
    }
    
    return null;
  }
  
  // Club event
  const member = await getMember(clubId, user.id);
  if (!member || (member.role !== 'owner' && member.role !== 'organizer')) {
    return null; // Not authorized, different error
  }
  
  const subscription = await import('@/lib/db/subscriptionRepo').then(m => 
    m.getClubSubscription(clubId)
  );
  const clubPlan = subscription?.plan ?? 'club_free';
  const planLimits = await getCachedClubPlanLimits(clubPlan);
  
  if (planLimits.maxActiveEvents === null) return null; // Unlimited
  
  // Count active club events
  const events = await listEvents();
  const now = new Date();
  const activeClub = events.filter(
    (e) =>
      e.club_id === clubId &&
      new Date(e.date_time) >= now
  );
  
  if (activeClub.length >= planLimits.maxActiveEvents) {
    return createPaywallTrigger(
      PAYWALL_REASONS.EVENT_LIMIT,
      clubPlan,
      'club_pro',
      { current: activeClub.length, limit: planLimits.maxActiveEvents }
    );
  }
  
  return null;
}

/**
 * Check paid event permission
 */
async function checkPaidEventPaywall(
  user: CurrentUser,
  context: Partial<PaywallCheckContext>
): Promise<PaywallTrigger | null> {
  const { clubId } = context;
  const userPlan = user.plan ?? 'free';
  
  // Personal paid event
  if (!clubId) {
    if (userPlan === 'free') {
      return createPaywallTrigger(
        PAYWALL_REASONS.PAID_EVENT,
        'free',
        'pro'
      );
    }
    return null;
  }
  
  // Club paid event
  const subscription = await import('@/lib/db/subscriptionRepo').then(m => 
    m.getClubSubscription(clubId)
  );
  const clubPlan = subscription?.plan ?? 'club_free';
  const planLimits = await getCachedClubPlanLimits(clubPlan);
  
  if (!planLimits.features.paidEvents) {
    return createPaywallTrigger(
      PAYWALL_REASONS.PAID_EVENT,
      clubPlan,
      'club_basic'
    );
  }
  
  return null;
}

/**
 * Check CSV export permission
 */
async function checkCsvExportPaywall(
  user: CurrentUser,
  context: Partial<PaywallCheckContext>
): Promise<PaywallTrigger | null> {
  const { clubId } = context;
  if (!clubId) return null;
  
  const subscription = await import('@/lib/db/subscriptionRepo').then(m => 
    m.getClubSubscription(clubId)
  );
  const clubPlan = subscription?.plan ?? 'club_free';
  const planLimits = await getCachedClubPlanLimits(clubPlan);
  
  if (!planLimits.features.csvExport) {
    return createPaywallTrigger(
      PAYWALL_REASONS.CSV_EXPORT,
      clubPlan,
      'club_basic'
    );
  }
  
  return null;
}

/**
 * Check Telegram Bot Pro permission
 */
async function checkTelegramBotProPaywall(
  user: CurrentUser,
  context: Partial<PaywallCheckContext>
): Promise<PaywallTrigger | null> {
  const { clubId } = context;
  if (!clubId) return null;
  
  const subscription = await import('@/lib/db/subscriptionRepo').then(m => 
    m.getClubSubscription(clubId)
  );
  const clubPlan = subscription?.plan ?? 'club_free';
  const planLimits = await getCachedClubPlanLimits(clubPlan);
  
  if (!planLimits.features.telegramBotPro) {
    return createPaywallTrigger(
      PAYWALL_REASONS.TELEGRAM_PRO,
      clubPlan,
      'club_pro'
    );
  }
  
  return null;
}

/**
 * Check club creation limit
 */
async function checkClubCreationPaywall(
  user: CurrentUser
): Promise<PaywallTrigger | null> {
  const userPlan = user.plan ?? 'free';
  
  if (userPlan === 'pro') return null; // Unlimited clubs
  
  // Count user's clubs
  const clubsCount = await countClubsByUserId(user.id);
  
  if (clubsCount >= 1) {
    return createPaywallTrigger(
      PAYWALL_REASONS.CLUB_LIMIT,
      'free',
      'pro',
      { current: clubsCount, limit: 1 }
    );
  }
  
  return null;
}

/**
 * Check organizer limit
 */
async function checkOrganizerLimitPaywall(
  user: CurrentUser,
  context: Partial<PaywallCheckContext>
): Promise<PaywallTrigger | null> {
  const { clubId } = context;
  if (!clubId) return null;
  
  const subscription = await import('@/lib/db/subscriptionRepo').then(m => 
    m.getClubSubscription(clubId)
  );
  const clubPlan = subscription?.plan ?? 'club_free';
  const planLimits = await getCachedClubPlanLimits(clubPlan);
  
  // Count current organizers (excluding owner)
  const organizersCount = await countMembersByRole(clubId, 'organizer');
  
  if (organizersCount >= planLimits.maxOrganizers) {
    return createPaywallTrigger(
      PAYWALL_REASONS.ORGANIZER_LIMIT,
      clubPlan,
      'club_pro',
      { current: organizersCount, limit: planLimits.maxOrganizers }
    );
  }
  
  return null;
}

/**
 * Check visibility permission
 */
async function checkVisibilityPaywall(
  user: CurrentUser,
  context: Partial<PaywallCheckContext>
): Promise<PaywallTrigger | null> {
  const { metadata } = context;
  const visibility = metadata?.visibility;
  const clubId = context.clubId;
  const userPlan = user.plan ?? 'free';
  
  // Only "unlisted" and "restricted" require premium
  if (visibility !== 'unlisted' && visibility !== 'restricted') {
    return null;
  }
  
  // Personal event: requires Pro
  if (!clubId && userPlan === 'free') {
    return createPaywallTrigger(
      PAYWALL_REASONS.VISIBILITY_RESTRICTED,
      'free',
      'pro',
      { feature: visibility }
    );
  }
  
  return null; // Club events can use any visibility
}

/**
 * Check analytics permission
 */
async function checkAnalyticsPaywall(
  user: CurrentUser,
  context: Partial<PaywallCheckContext>
): Promise<PaywallTrigger | null> {
  const { clubId, metadata } = context;
  const advanced = metadata?.advanced ?? false;
  
  if (!clubId) return null;
  
  const subscription = await import('@/lib/db/subscriptionRepo').then(m => 
    m.getClubSubscription(clubId)
  );
  const clubPlan = subscription?.plan ?? 'club_free';
  const planLimits = await getCachedClubPlanLimits(clubPlan);
  
  const hasAccess = advanced
    ? planLimits.features.analyticsAdvanced
    : planLimits.features.analyticsBasic;
  
  if (!hasAccess) {
    return createPaywallTrigger(
      PAYWALL_REASONS.ANALYTICS,
      clubPlan,
      advanced ? 'club_pro' : 'club_basic'
    );
  }
  
  return null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if response contains paywall
 */
export function hasPaywall(response: Response | any): boolean {
  if (response instanceof Response) {
    return response.status === 402;
  }
  return response && typeof response === 'object' && 'paywall' in response;
}

/**
 * Create paywall response for API
 */
export function createPaywallResponse(trigger: PaywallTrigger): { paywall: PaywallTrigger } {
  return { paywall: trigger };
}

