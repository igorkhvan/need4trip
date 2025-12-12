import { supabase } from "@/lib/db/client";
import { InternalError } from "@/lib/errors";
import type { ClubPlan, UserPlan } from "@/lib/types/club";

const clubSubsTable = "club_subscriptions";
const usersTable = "users";

function ensureClient() {
  if (!supabase) {
    console.warn("Supabase client is not configured");
    return null;
  }
  return supabase;
}

// ============================================================================
// Database Types (snake_case)
// ============================================================================

export interface DbClubSubscription {
  club_id: string;
  plan: ClubPlan;
  valid_until: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Club Subscription Operations
// ============================================================================

/**
 * Get club subscription
 */
export async function getClubSubscription(
  clubId: string
): Promise<DbClubSubscription | null> {
  const client = ensureClient();
  if (!client) return null;

  const { data, error } = await client
    .from(clubSubsTable)
    .select("*")
    .eq("club_id", clubId)
    .maybeSingle();

  if (error) {
    console.error("Failed to get club subscription", error);
    throw new InternalError("Failed to get club subscription", error);
  }

  return data ? (data as DbClubSubscription) : null;
}

/**
 * Create club subscription (usually called by trigger, but can be manual)
 */
export async function createClubSubscription(
  clubId: string,
  plan: ClubPlan = "club_free",
  validUntil: string | null = null
): Promise<DbClubSubscription> {
  const client = ensureClient();
  if (!client) {
    throw new InternalError("Supabase client is not configured");
  }

  const now = new Date().toISOString();

  const insertPayload = {
    club_id: clubId,
    plan,
    valid_until: validUntil,
    active: true,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await client
    .from(clubSubsTable)
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to create club subscription", error);
    throw new InternalError("Failed to create club subscription", error);
  }

  return data as DbClubSubscription;
}

/**
 * Update club subscription
 */
export async function updateClubSubscription(
  clubId: string,
  plan: ClubPlan,
  validUntil: string | null = null,
  active: boolean = true
): Promise<DbClubSubscription | null> {
  const client = ensureClient();
  if (!client) {
    throw new InternalError("Supabase client is not configured");
  }

  const patch = {
    plan,
    valid_until: validUntil,
    active,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from(clubSubsTable)
    .update(patch)
    .eq("club_id", clubId)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("Failed to update club subscription", error);
    throw new InternalError("Failed to update club subscription", error);
  }

  return data ? (data as DbClubSubscription) : null;
}

/**
 * Upgrade club subscription
 */
export async function upgradeClubSubscription(
  clubId: string,
  plan: ClubPlan,
  validUntil: string
): Promise<DbClubSubscription | null> {
  return updateClubSubscription(clubId, plan, validUntil, true);
}

/**
 * Downgrade club subscription
 */
export async function downgradeClubSubscription(
  clubId: string,
  plan: ClubPlan
): Promise<DbClubSubscription | null> {
  // For free plan, valid_until should be null (no expiration)
  const validUntil = plan === "club_free" ? null : undefined;
  return updateClubSubscription(clubId, plan, validUntil, true);
}

/**
 * Deactivate club subscription (when expired or cancelled)
 */
export async function deactivateClubSubscription(
  clubId: string
): Promise<DbClubSubscription | null> {
  const client = ensureClient();
  if (!client) {
    throw new InternalError("Supabase client is not configured");
  }

  const patch = {
    active: false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from(clubSubsTable)
    .update(patch)
    .eq("club_id", clubId)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("Failed to deactivate club subscription", error);
    throw new InternalError("Failed to deactivate club subscription", error);
  }

  return data ? (data as DbClubSubscription) : null;
}

/**
 * List expiring subscriptions (within N days)
 */
export async function listExpiringSubscriptions(
  daysAhead: number = 7
): Promise<DbClubSubscription[]> {
  const client = ensureClient();
  if (!client) return [];

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const { data, error } = await client
    .from(clubSubsTable)
    .select("*")
    .eq("active", true)
    .not("valid_until", "is", null)
    .lte("valid_until", futureDate.toISOString())
    .gte("valid_until", new Date().toISOString())
    .order("valid_until", { ascending: true });

  if (error) {
    console.error("Failed to list expiring subscriptions", error);
    throw new InternalError("Failed to list expiring subscriptions", error);
  }

  return (data ?? []) as DbClubSubscription[];
}

// ============================================================================
// Personal Subscription Operations (User Plan)
// ============================================================================

/**
 * Get user's personal plan
 */
export async function getPersonalPlan(userId: string): Promise<UserPlan> {
  const client = ensureClient();
  if (!client) return "free"; // Default

  const { data, error } = await client
    .from(usersTable)
    .select("plan")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to get user plan", error);
    return "free"; // Default on error
  }

  return (data?.plan as UserPlan) ?? "free";
}

/**
 * Update user's personal plan
 */
export async function updatePersonalPlan(
  userId: string,
  plan: UserPlan
): Promise<boolean> {
  const client = ensureClient();
  if (!client) {
    throw new InternalError("Supabase client is not configured");
  }

  const { error } = await client
    .from(usersTable)
    .update({ plan, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    console.error("Failed to update user plan", error);
    throw new InternalError("Failed to update user plan", error);
  }

  return true;
}

/**
 * Upgrade user to pro
 */
export async function upgradePersonalPlan(userId: string): Promise<boolean> {
  return updatePersonalPlan(userId, "pro");
}

/**
 * Downgrade user to free
 */
export async function downgradePersonalPlan(userId: string): Promise<boolean> {
  return updatePersonalPlan(userId, "free");
}

/**
 * List all pro users (for analytics/features)
 */
export async function listProUsers(): Promise<string[]> {
  const client = ensureClient();
  if (!client) return [];

  const { data, error } = await client
    .from(usersTable)
    .select("id")
    .eq("plan", "pro");

  if (error) {
    console.error("Failed to list pro users", error);
    throw new InternalError("Failed to list pro users", error);
  }

  return (data ?? []).map((row) => row.id);
}

