/**
 * Club Plan Repository
 * 
 * Database operations for club_plans table
 */

import { supabase, ensureClient } from "./client";
import type { DbClubPlan, ClubPlan, ClubPlanIdType, ClubPlanLimits } from "@/lib/types/clubPlan";
import { mapDbClubPlanToDomain, extractPlanLimits } from "@/lib/types/clubPlan";
import { InternalError, NotFoundError } from "@/lib/errors";
import { log } from "@/lib/utils/logger";

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get all club plans
 */
export async function getAllClubPlans(): Promise<ClubPlan[]> {
  ensureClient();
  if (!supabase) {
    throw new InternalError("Supabase client is not configured");
  }
  
  const { data, error } = await supabase
    .from('club_plans')
    .select('*')
    .order('price_monthly', { ascending: true });
  
  if (error) {
    log.error("Failed to fetch club plans", { error });
    throw new InternalError('Failed to fetch club plans');
  }
  
  return (data as DbClubPlan[]).map(mapDbClubPlanToDomain);
}

/**
 * Get club plan by ID
 */
export async function getClubPlanById(id: ClubPlanIdType): Promise<ClubPlan> {
  ensureClient();
  if (!supabase) {
    throw new InternalError("Supabase client is not configured");
  }
  
  const { data, error } = await supabase
    .from('club_plans')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error || !data) {
    log.error("Failed to fetch club plan by ID", { planId: id, error });
    throw new NotFoundError(`Club plan '${id}' not found`);
  }
  
  return mapDbClubPlanToDomain(data as DbClubPlan);
}

/**
 * Get club plan limits by ID
 */
export async function getClubPlanLimits(id: ClubPlanIdType): Promise<ClubPlanLimits> {
  const plan = await getClubPlanById(id);
  return extractPlanLimits(plan);
}

/**
 * Get club plan by price (for filtering/searching)
 */
export async function getClubPlansByPriceRange(
  minPrice: number,
  maxPrice: number
): Promise<ClubPlan[]> {
  ensureClient();
  if (!supabase) {
    throw new InternalError("Supabase client is not configured");
  }
  
  const { data, error } = await supabase
    .from('club_plans')
    .select('*')
    .gte('price_monthly', minPrice)
    .lte('price_monthly', maxPrice)
    .order('price_monthly', { ascending: true });
  
  if (error) {
    log.error("Failed to fetch club plans by price range", { minPrice, maxPrice, error });
    throw new InternalError('Failed to fetch club plans by price');
  }
  
  return (data as DbClubPlan[]).map(mapDbClubPlanToDomain);
}

/**
 * Check if plan exists
 */
export async function clubPlanExists(id: ClubPlanIdType): Promise<boolean> {
  ensureClient();
  if (!supabase) return false;
  
  const { data, error } = await supabase
    .from('club_plans')
    .select('id')
    .eq('id', id)
    .single();
  
  return !error && !!data;
}

/**
 * Get free plan
 */
export async function getFreePlan(): Promise<ClubPlan> {
  return getClubPlanById('club_free');
}

/**
 * Get basic plan
 */
export async function getBasicPlan(): Promise<ClubPlan> {
  return getClubPlanById('club_basic');
}

/**
 * Get pro plan
 */
export async function getProPlan(): Promise<ClubPlan> {
  return getClubPlanById('club_pro');
}

// ============================================================================
// FEATURE CHECKS
// ============================================================================

/**
 * Check if plan allows paid events
 */
export async function planAllowsPaidEvents(planId: ClubPlanIdType): Promise<boolean> {
  const limits = await getClubPlanLimits(planId);
  return limits.features.paidEvents;
}

/**
 * Check if plan allows CSV export
 */
export async function planAllowsCsvExport(planId: ClubPlanIdType): Promise<boolean> {
  const limits = await getClubPlanLimits(planId);
  return limits.features.csvExport;
}

/**
 * Check if plan allows Telegram Bot Pro
 */
export async function planAllowsTelegramBotPro(planId: ClubPlanIdType): Promise<boolean> {
  const limits = await getClubPlanLimits(planId);
  return limits.features.telegramBotPro;
}

/**
 * Check if plan allows analytics
 */
export async function planAllowsAnalytics(
  planId: ClubPlanIdType,
  advanced: boolean = false
): Promise<boolean> {
  const limits = await getClubPlanLimits(planId);
  return advanced 
    ? limits.features.analyticsAdvanced 
    : limits.features.analyticsBasic;
}

/**
 * Check if plan has unlimited events
 */
export async function planHasUnlimitedEvents(planId: ClubPlanIdType): Promise<boolean> {
  const limits = await getClubPlanLimits(planId);
  return limits.maxActiveEvents === null;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get plan order (for comparing plans)
 */
export function getPlanOrder(planId: ClubPlanIdType): number {
  const order: Record<ClubPlanIdType, number> = {
    club_free: 0,
    club_basic: 1,
    club_pro: 2,
  };
  return order[planId];
}

/**
 * Compare plans
 */
export function comparePlans(a: ClubPlanIdType, b: ClubPlanIdType): number {
  return getPlanOrder(a) - getPlanOrder(b);
}

/**
 * Check if upgrade is needed
 */
export function isUpgradeNeeded(
  currentPlan: ClubPlanIdType,
  requiredPlan: ClubPlanIdType
): boolean {
  return getPlanOrder(currentPlan) < getPlanOrder(requiredPlan);
}

