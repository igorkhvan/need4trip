/**
 * Club Plan Types
 * 
 * Types for club subscription plans and their limits
 */

import { z } from "zod";

// ============================================================================
// ENUMS
// ============================================================================

export const ClubPlanId = {
  FREE: 'club_free',
  BASIC: 'club_basic',
  PRO: 'club_pro',
} as const;

export type ClubPlanIdType = typeof ClubPlanId[keyof typeof ClubPlanId];

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Club Plan - full plan details from database
 */
export interface ClubPlan {
  id: ClubPlanIdType;
  name: string;
  description: string | null;
  priceMonthly: number;
  
  // Limits
  maxActiveEvents: number | null;  // null = unlimited
  maxOrganizers: number;
  
  // Features
  allowPaidEvents: boolean;
  allowCsvExport: boolean;
  allowTelegramBotPro: boolean;
  allowAnalyticsBasic: boolean;
  allowAnalyticsAdvanced: boolean;
  allowWhiteLabel: boolean;
  allowSubdomain: boolean;
  allowApiAccess: boolean;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * Club Plan Limits - extracted limits for easy access
 */
export interface ClubPlanLimits {
  maxActiveEvents: number | null;  // null = unlimited
  maxOrganizers: number;
  features: {
    paidEvents: boolean;
    csvExport: boolean;
    telegramBotPro: boolean;
    analyticsBasic: boolean;
    analyticsAdvanced: boolean;
    whiteLabel: boolean;
    subdomain: boolean;
    apiAccess: boolean;
  };
}

/**
 * Club Plan Summary - minimal info for display
 */
export interface ClubPlanSummary {
  id: ClubPlanIdType;
  name: string;
  priceMonthly: number;
}

// ============================================================================
// DATABASE ROW TYPE
// ============================================================================

export interface DbClubPlan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  max_active_events: number | null;
  max_organizers: number;
  allow_paid_events: boolean;
  allow_csv_export: boolean;
  allow_telegram_bot_pro: boolean;
  allow_analytics_basic: boolean;
  allow_analytics_advanced: boolean;
  allow_white_label: boolean;
  allow_subdomain: boolean;
  allow_api_access: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const clubPlanIdSchema = z.enum(['club_free', 'club_basic', 'club_pro']);

export const clubPlanSchema = z.object({
  id: clubPlanIdSchema,
  name: z.string(),
  description: z.string().nullable(),
  priceMonthly: z.number().nonnegative(),
  maxActiveEvents: z.number().int().positive().nullable(),
  maxOrganizers: z.number().int().positive(),
  allowPaidEvents: z.boolean(),
  allowCsvExport: z.boolean(),
  allowTelegramBotPro: z.boolean(),
  allowAnalyticsBasic: z.boolean(),
  allowAnalyticsAdvanced: z.boolean(),
  allowWhiteLabel: z.boolean(),
  allowSubdomain: z.boolean(),
  allowApiAccess: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ============================================================================
// MAPPERS
// ============================================================================

/**
 * Map database row to domain ClubPlan
 */
export function mapDbClubPlanToDomain(db: DbClubPlan): ClubPlan {
  return {
    id: db.id as ClubPlanIdType,
    name: db.name,
    description: db.description,
    priceMonthly: Number(db.price_monthly),
    maxActiveEvents: db.max_active_events,
    maxOrganizers: db.max_organizers,
    allowPaidEvents: db.allow_paid_events,
    allowCsvExport: db.allow_csv_export,
    allowTelegramBotPro: db.allow_telegram_bot_pro,
    allowAnalyticsBasic: db.allow_analytics_basic,
    allowAnalyticsAdvanced: db.allow_analytics_advanced,
    allowWhiteLabel: db.allow_white_label,
    allowSubdomain: db.allow_subdomain,
    allowApiAccess: db.allow_api_access,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

/**
 * Extract limits from ClubPlan
 */
export function extractPlanLimits(plan: ClubPlan): ClubPlanLimits {
  return {
    maxActiveEvents: plan.maxActiveEvents,
    maxOrganizers: plan.maxOrganizers,
    features: {
      paidEvents: plan.allowPaidEvents,
      csvExport: plan.allowCsvExport,
      telegramBotPro: plan.allowTelegramBotPro,
      analyticsBasic: plan.allowAnalyticsBasic,
      analyticsAdvanced: plan.allowAnalyticsAdvanced,
      whiteLabel: plan.allowWhiteLabel,
      subdomain: plan.allowSubdomain,
      apiAccess: plan.allowApiAccess,
    },
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if plan allows feature
 */
export function planAllowsFeature(
  plan: ClubPlan,
  feature: keyof ClubPlanLimits['features']
): boolean {
  return extractPlanLimits(plan).features[feature];
}

/**
 * Check if plan has unlimited events
 */
export function hasUnlimitedEvents(plan: ClubPlan): boolean {
  return plan.maxActiveEvents === null;
}

/**
 * Get plan display name with price
 */
export function getPlanDisplayName(plan: ClubPlan): string {
  if (plan.priceMonthly === 0) {
    return `${plan.name} (Бесплатно)`;
  }
  return `${plan.name} (₽${plan.priceMonthly}/мес)`;
}

/**
 * Compare plans by price
 */
export function comparePlansByPrice(a: ClubPlan, b: ClubPlan): number {
  return a.priceMonthly - b.priceMonthly;
}

/**
 * Check if upgrade is needed
 */
export function needsUpgrade(
  currentPlan: ClubPlan,
  requiredPlan: ClubPlanIdType
): boolean {
  const planOrder: Record<ClubPlanIdType, number> = {
    club_free: 0,
    club_basic: 1,
    club_pro: 2,
  };
  
  return planOrder[currentPlan.id] < planOrder[requiredPlan];
}

