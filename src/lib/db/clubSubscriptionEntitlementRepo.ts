/**
 * Club Subscription Entitlements Repository
 *
 * Pre-club subscription entitlements (ADR-002).
 * Source: docs/adr/active/ADR-002_PRE_CLUB_SUBSCRIPTION_ENTITLEMENTS.md
 */

import { getAdminDb } from "./client";
import { log } from "@/lib/utils/logger";

/**
 * Check if user has an unlinked active entitlement (right to create a club).
 *
 * Semantics (EXACT per STEP 2 spec):
 * - user_id matches
 * - status = 'active'
 * - valid_from <= now < valid_until
 * - club_id IS NULL
 *
 * @returns true if user has at least one active unlinked entitlement
 */
export async function hasUnlinkedActiveSubscriptionForUser(
  userId: string
): Promise<boolean> {
  const db = getAdminDb();

  const now = new Date().toISOString();

  const { data, error } = await db
    .from("club_subscription_entitlements")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .lte("valid_from", now)
    .gt("valid_until", now)
    .is("club_id", null)
    .limit(1);

  if (error) {
    log.error("Failed to check unlinked entitlement", { userId, error });
    return false;
  }

  return (data?.length ?? 0) > 0;
}
