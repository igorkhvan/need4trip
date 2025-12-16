/**
 * Plan Repository v2.1
 * 
 * Database operations for club_plans table (including FREE plan)
 * All plans are cached for optimal performance
 * Source: docs/BILLING_AND_LIMITS.md
 */

import { supabase, ensureClient } from "./client";
import type { ClubPlan, PlanId } from "@/lib/types/billing";
import { InternalError, NotFoundError } from "@/lib/errors";
import { log } from "@/lib/utils/logger";
import { StaticCache } from "@/lib/cache/staticCache";

// ============================================================================
// Database Types (snake_case from DB)
// ============================================================================

interface DbClubPlan {
  id: string;
  title: string;
  price_monthly_kzt: number;
  currency: string;
  max_members: number | null;
  max_event_participants: number | null;
  allow_paid_events: boolean;
  allow_csv_export: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Mappers
// ============================================================================

function mapDbPlanToDomain(db: DbClubPlan): ClubPlan {
  return {
    id: db.id as PlanId, // PlanId now includes 'free'
    title: db.title,
    priceMonthlyKzt: Number(db.price_monthly_kzt),
    currency: db.currency,
    maxMembers: db.max_members,
    maxEventParticipants: db.max_event_participants,
    allowPaidEvents: db.allow_paid_events,
    allowCsvExport: db.allow_csv_export,
    isPublic: db.is_public,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

// ============================================================================
// Cache Configuration
// ============================================================================

const plansCache = new StaticCache<ClubPlan>(
  {
    ttl: 5 * 60 * 1000, // 5 minutes - plans may change when pricing updates
    name: 'club_plans',
  },
  async () => {
    // Loader function - loads ALL plans including FREE
    ensureClient();
    if (!supabase) {
      throw new InternalError("Supabase client is not configured");
    }

    const { data, error } = await supabase
      .from('club_plans')
      .select('*')
      .order('price_monthly_kzt', { ascending: true });

    if (error) {
      log.error("Failed to load club plans for cache", { error });
      throw new InternalError('Failed to load club plans', error);
    }

    return (data as DbClubPlan[]).map(mapDbPlanToDomain);
  },
  (plan) => plan.id // Key extractor
);

// ============================================================================
// Repository Functions
// ============================================================================

/**
 * Get all public club plans (cached)
 * Includes FREE plan for pricing page
 */
export async function listPublicPlans(): Promise<ClubPlan[]> {
  const allPlans = await plansCache.getAll();
  return allPlans.filter(plan => plan.isPublic);
}

/**
 * Get club plan by ID (cached, O(1))
 * Works for both paid plans and FREE plan
 */
export async function getPlanById(planId: PlanId): Promise<ClubPlan> {
  const plan = await plansCache.getByKey(planId);
  
  if (!plan) {
    log.error("Plan not found", { planId });
    throw new NotFoundError(`Plan '${planId}' not found`);
  }

  return plan;
}

/**
 * Check if plan exists (cached)
 */
export async function planExists(planId: PlanId): Promise<boolean> {
  const plan = await plansCache.getByKey(planId);
  return !!plan;
}

/**
 * Get required plan for participants count (dynamic from DB)
 * Queries cached database plans to find minimum plan that supports the count
 */
export async function getRequiredPlanForParticipants(
  count: number
): Promise<PlanId> {
  const allPlans = await plansCache.getAll();
  
  // Sort by max_event_participants (nulls last = unlimited)
  const sorted = allPlans
    .filter(p => p.maxEventParticipants !== null)
    .sort((a, b) => (a.maxEventParticipants ?? Infinity) - (b.maxEventParticipants ?? Infinity));

  // Find smallest plan that fits
  for (const plan of sorted) {
    if (plan.maxEventParticipants !== null && count <= plan.maxEventParticipants) {
      return plan.id;
    }
  }

  // If no plan fits, need unlimited
  return "club_unlimited";
}

/**
 * Get required plan for club members count (dynamic from DB)
 */
export async function getRequiredPlanForMembers(
  count: number
): Promise<PlanId> {
  const allPlans = await plansCache.getAll();
  
  // Filter out FREE (can't have clubs), sort by max_members
  const sorted = allPlans
    .filter(p => p.id !== 'free' && p.maxMembers !== null)
    .sort((a, b) => (a.maxMembers ?? Infinity) - (b.maxMembers ?? Infinity));

  // Find smallest plan that fits
  for (const plan of sorted) {
    if (plan.maxMembers !== null && count <= plan.maxMembers) {
      return plan.id as PlanId;
    }
  }

  // If no plan fits, need unlimited
  return "club_unlimited";
}

/**
 * Invalidate cache (for admin operations)
 * Call this after updating plans
 */
export async function invalidatePlansCache(): Promise<void> {
  plansCache.clear();
  log.info("Club plans cache invalidated");
}
