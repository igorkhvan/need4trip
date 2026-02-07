/**
 * Club Subscription Repository v2.0
 * 
 * Database operations for club_subscriptions table
 * Source: docs/BILLING_AND_LIMITS.md
 */

import { getAdminDb } from "./client";
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
  const db = getAdminDb();

  const { data, error } = await db
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
 * Get subscriptions for multiple clubs at once (batch query)
 */
export async function getClubSubscriptionsByClubIds(clubIds: string[]): Promise<Map<string, ClubSubscription>> {
  if (clubIds.length === 0) return new Map();
  
  const db = getAdminDb();
  
  const { data, error } = await db
    .from('club_subscriptions')
    .select('*')
    .in('club_id', clubIds);
  
  if (error) {
    log.error("Failed to get club subscriptions by IDs", { clubIds, error });
    return new Map(); // Return empty map on error
  }
  
  const map = new Map<string, ClubSubscription>();
  (data ?? []).forEach((row: any) => {
    const subscription = mapDbSubscriptionToDomain(row as DbClubSubscription);
    map.set(subscription.clubId, subscription);
  });
  
  return map;
}

/**
 * Upsert club subscription
 */
export async function upsertClubSubscription(
  subscription: Omit<ClubSubscription, 'createdAt' | 'updatedAt'>
): Promise<ClubSubscription> {
  const db = getAdminDb();

  const dbData = {
    club_id: subscription.clubId,
    plan_id: subscription.planId,
    status: subscription.status,
    current_period_start: subscription.currentPeriodStart,
    current_period_end: subscription.currentPeriodEnd,
    grace_until: subscription.graceUntil,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await db
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
  const db = getAdminDb();

  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (graceUntil !== undefined) {
    updates.grace_until = graceUntil;
  }

  const { error } = await db
    .from('club_subscriptions')
    .update(updates)
    .eq('club_id', clubId);

  if (error) {
    log.error("Failed to set club subscription status", { clubId, status, error });
    throw new InternalError("Failed to set club subscription status", error);
  }
}

/**
 * Check if user has an unlinked active/grace subscription (entitlement to create a club).
 *
 * Policy (UX_CONTRACT_CLUB_CREATION, Architect decision):
 * - A club may be created ONLY if there exists an active or grace subscription
 *   that is NOT yet linked to a club (club_id IS NULL).
 * - Each subscription grants the right to create EXACTLY ONE club.
 *
 * Current schema limitation: club_subscriptions.club_id is NOT NULL (PK).
 * No unlinked subscriptions can exist until Step 2 adds schema support
 * (e.g. club_id nullable + user_id for pre-club entitlements).
 *
 * Until then, this function returns false — no user has unlinked entitlement.
 * Step 2 will add the schema and update this implementation to query actual data.
 *
 * @returns true if user has at least one active/grace subscription with club_id IS NULL
 */
export async function hasUnlinkedActiveSubscriptionForUser(_userId: string): Promise<boolean> {
  // Schema does not support unlinked subscriptions yet. Always false.
  return false;
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
