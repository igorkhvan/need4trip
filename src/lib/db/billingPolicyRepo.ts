/**
 * Billing Policy Repository v2.0
 * 
 * Database operations for billing_policy and billing_policy_actions tables
 * Source: docs/BILLING_AND_LIMITS.md
 */

import { supabase, ensureClient } from "./client";
import type { 
  BillingPolicy, 
  BillingPolicyAction, 
  BillingActionCode,
  SubscriptionStatus 
} from "@/lib/types/billing";
import { InternalError } from "@/lib/errors";
import { log } from "@/lib/utils/logger";

// ============================================================================
// Database Types
// ============================================================================

interface DbBillingPolicy {
  id: string;
  grace_period_days: number;
  pending_ttl_minutes: number;
  created_at: string;
  updated_at: string;
}

interface DbBillingPolicyAction {
  policy_id: string;
  status: string;
  action: string;
  is_allowed: boolean;
}

// ============================================================================
// Mappers
// ============================================================================

function mapDbPolicyToDomain(db: DbBillingPolicy): BillingPolicy {
  return {
    id: db.id,
    gracePeriodDays: db.grace_period_days,
    pendingTtlMinutes: db.pending_ttl_minutes,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function mapDbPolicyActionToDomain(db: DbBillingPolicyAction): BillingPolicyAction {
  return {
    policyId: db.policy_id,
    status: db.status as SubscriptionStatus,
    action: db.action as BillingActionCode,
    isAllowed: db.is_allowed,
  };
}

// ============================================================================
// Repository Functions
// ============================================================================

/**
 * Get default billing policy
 */
export async function getDefaultBillingPolicy(): Promise<BillingPolicy> {
  ensureClient();
  if (!supabase) {
    throw new InternalError("Supabase client is not configured");
  }

  const { data, error } = await supabase
    .from('billing_policy')
    .select('*')
    .eq('id', 'default')
    .single();

  if (error || !data) {
    log.error("Failed to fetch default billing policy", { error });
    throw new InternalError('Failed to fetch default billing policy', error);
  }

  return mapDbPolicyToDomain(data as DbBillingPolicy);
}

/**
 * Get policy actions map: status -> Set<action>
 * Returns map of allowed actions per status
 */
export async function getPolicyActionsMap(
  policyId: string = 'default'
): Promise<Record<SubscriptionStatus, Set<BillingActionCode>>> {
  ensureClient();
  if (!supabase) {
    throw new InternalError("Supabase client is not configured");
  }

  const { data, error } = await supabase
    .from('billing_policy_actions')
    .select('*')
    .eq('policy_id', policyId)
    .eq('is_allowed', true);  // Only get allowed actions

  if (error) {
    log.error("Failed to fetch policy actions", { policyId, error });
    throw new InternalError('Failed to fetch policy actions', error);
  }

  // Build map: status -> Set<action>
  const map: Record<SubscriptionStatus, Set<BillingActionCode>> = {
    pending: new Set(),
    active: new Set(),  // active doesn't need checks, but for completeness
    grace: new Set(),
    expired: new Set(),
  };

  if (data) {
    for (const row of data as DbBillingPolicyAction[]) {
      const status = row.status as SubscriptionStatus;
      const action = row.action as BillingActionCode;
      
      if (map[status]) {
        map[status].add(action);
      }
    }
  }

  return map;
}

/**
 * Check if specific action is allowed for given status
 */
export async function isActionAllowed(
  status: SubscriptionStatus,
  action: BillingActionCode,
  policyId: string = 'default'
): Promise<boolean> {
  // Active subscription - all actions allowed
  if (status === 'active') {
    return true;
  }

  ensureClient();
  if (!supabase) {
    return false;
  }

  const { data, error } = await supabase
    .from('billing_policy_actions')
    .select('is_allowed')
    .eq('policy_id', policyId)
    .eq('status', status)
    .eq('action', action)
    .maybeSingle();

  if (error) {
    log.error("Failed to check action permission", { policyId, status, action, error });
    return false;
  }

  return data?.is_allowed === true;
}
