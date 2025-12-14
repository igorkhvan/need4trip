/**
 * Plan Repository v2.0
 * 
 * Database operations for club_plans table
 * Source: docs/BILLING_AND_LIMITS.md
 */

import { supabase, ensureClient } from "./client";
import type { ClubPlan, PlanId } from "@/lib/types/billing";
import { InternalError, NotFoundError } from "@/lib/errors";
import { log } from "@/lib/utils/logger";

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
    id: db.id as PlanId,
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
// Repository Functions
// ============================================================================

/**
 * Get all public club plans (for /api/plans)
 */
export async function listPublicPlans(): Promise<ClubPlan[]> {
  ensureClient();
  if (!supabase) {
    throw new InternalError("Supabase client is not configured");
  }

  // @ts-expect-error - club_plans table exists but missing from generated types
  const { data, error } = await supabase
    .from('club_plans')
    .select('*')
    .eq('is_public', true)
    .order('price_monthly_kzt', { ascending: true });

  if (error) {
    log.error("Failed to fetch public plans", { error });
    throw new InternalError('Failed to fetch public plans', error);
  }

  return (data as DbClubPlan[]).map(mapDbPlanToDomain);
}

/**
 * Get club plan by ID
 */
export async function getPlanById(planId: PlanId): Promise<ClubPlan> {
  ensureClient();
  if (!supabase) {
    throw new InternalError("Supabase client is not configured");
  }

  // @ts-expect-error - club_plans table exists but missing from generated types
  const { data, error } = await supabase
    .from('club_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (error || !data) {
    log.error("Failed to fetch plan by ID", { planId, error });
    throw new NotFoundError(`Plan '${planId}' not found`);
  }

  return mapDbPlanToDomain(data as DbClubPlan);
}

/**
 * Check if plan exists
 */
export async function planExists(planId: PlanId): Promise<boolean> {
  ensureClient();
  if (!supabase) return false;

  // @ts-expect-error - club_plans table exists but missing from generated types
  const { data, error } = await supabase
    .from('club_plans')
    .select('id')
    .eq('id', planId)
    .maybeSingle();

  return !error && !!data;
}
