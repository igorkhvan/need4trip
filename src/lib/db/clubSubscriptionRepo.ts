/**
 * Club Subscription Repository v2.0
 * 
 * Database operations for club_subscriptions table
 * Source: docs/BILLING_AND_LIMITS.md
 */

import { supabaseAdmin, ensureAdminClient } from "./client";
import type { ClubSubscription, SubscriptionStatus, PlanId } from "@/lib/types/billing";
import { InternalError } from "@/lib/errors";
import { log } from "@/lib/utils/logger";

// ============================================================================
// Database Types
// ============================================================================

interface DbClubSubscription {
  club_id: string;
  plan_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  grace_until: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Mappers
// ============================================================================

function mapDbSubscriptionToDomain(db: DbClubSubscription): ClubSubscription {
  return {
    clubId: db.club_id,
    planId: db.plan_id as PlanId,
    status: db.status as SubscriptionStatus,
    currentPeriodStart: db.current_period_start,
    currentPeriodEnd: db.current_period_end,
    graceUntil: db.grace_until,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

// ============================================================================
// Repository Functions
// ============================================================================

/**
 * Get club subscription
 */
export async function getClubSubscription(
  clubId: string
): Promise<ClubSubscription | null> {
  ensureAdminClient();
  if (!supabaseAdmin) return null;

  const { data, error } = await supabaseAdmin
    .from('club_subscriptions')
    .select('*')
    .eq('club_id', clubId)
    .maybeSingle();

  if (error) {
    log.error("Failed to get club subscription", { clubId, error });
    throw new InternalError("Failed to get club subscription", error);
  }

  if (!data) {
    return null;
  }

  return mapDbSubscriptionToDomain(data as DbClubSubscription);
}

/**
 * Upsert club subscription
 */
export async function upsertClubSubscription(
  subscription: Omit<ClubSubscription, 'createdAt' | 'updatedAt'>
): Promise<ClubSubscription> {
  ensureAdminClient();
  if (!supabaseAdmin) {
    throw new InternalError("Supabase client is not configured");
  }

  const dbData = {
    club_id: subscription.clubId,
    plan_id: subscription.planId,
    status: subscription.status,
    current_period_start: subscription.currentPeriodStart,
    current_period_end: subscription.currentPeriodEnd,
    grace_until: subscription.graceUntil,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('club_subscriptions')
    .upsert(dbData, { onConflict: 'club_id' })
    .select()
    .single();

  if (error || !data) {
    log.error("Failed to upsert club subscription", { clubId: subscription.clubId, error });
    throw new InternalError("Failed to upsert club subscription", error);
  }

  return mapDbSubscriptionToDomain(data as DbClubSubscription);
}

/**
 * Set club subscription status
 */
export async function setClubSubscriptionStatus(
  clubId: string,
  status: SubscriptionStatus,
  graceUntil?: string | null
): Promise<void> {
  ensureAdminClient();
  if (!supabaseAdmin) {
    throw new InternalError("Supabase client is not configured");
  }

  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (graceUntil !== undefined) {
    updates.grace_until = graceUntil;
  }

  const { error } = await supabaseAdmin
    .from('club_subscriptions')
    .update(updates)
    .eq('club_id', clubId);

  if (error) {
    log.error("Failed to set club subscription status", { clubId, status, error });
    throw new InternalError("Failed to set club subscription status", error);
  }
}

/**
 * Activate subscription (after successful payment)
 */
export async function activateSubscription(
  clubId: string,
  planId: PlanId,
  periodStart: string,
  periodEnd: string,
  graceUntil?: string | null
): Promise<ClubSubscription> {
  return upsertClubSubscription({
    clubId,
    planId,
    status: 'active',
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    graceUntil: graceUntil ?? null,
  });
}
