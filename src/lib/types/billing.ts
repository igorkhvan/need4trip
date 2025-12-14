/**
 * Billing Types v2.0
 * 
 * Source: docs/BILLING_AND_LIMITS.md
 */

import { z } from "zod";

// ============================================================================
// Plan Types
// ============================================================================

export const PLAN_IDS = ["club_50", "club_500", "club_unlimited"] as const;
export type PlanId = typeof PLAN_IDS[number];

// For display purposes (includes free)
export type PlanIdWithFree = PlanId | "free";

export interface ClubPlan {
  id: PlanId;
  title: string;
  priceMonthlyKzt: number;
  currency: string;
  maxMembers: number | null;  // null = unlimited
  maxEventParticipants: number | null;  // null = unlimited
  allowPaidEvents: boolean;
  allowCsvExport: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

// For pricing page display (includes free plan)
export interface PricingPlan {
  id: PlanIdWithFree;
  title: string;
  priceMonthlyKzt: number;
  currency: string;
  maxMembers: number | null;
  maxEventParticipants: number | null;
  allowPaidEvents: boolean;
  allowCsvExport: boolean;
}

export const ClubPlanSchema = z.object({
  id: z.enum(PLAN_IDS),
  title: z.string(),
  priceMonthlyKzt: z.number(),
  currency: z.string(),
  maxMembers: z.number().nullable(),
  maxEventParticipants: z.number().nullable(),
  allowPaidEvents: z.boolean(),
  allowCsvExport: z.boolean(),
  isPublic: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ============================================================================
// Subscription Types
// ============================================================================

export const SUBSCRIPTION_STATUSES = ["pending", "active", "grace", "expired"] as const;
export type SubscriptionStatus = typeof SUBSCRIPTION_STATUSES[number];

export interface ClubSubscription {
  clubId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  graceUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export const ClubSubscriptionSchema = z.object({
  clubId: z.string().uuid(),
  planId: z.enum(PLAN_IDS),
  status: z.enum(SUBSCRIPTION_STATUSES),
  currentPeriodStart: z.string().nullable(),
  currentPeriodEnd: z.string().nullable(),
  graceUntil: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ============================================================================
// Billing Policy Types
// ============================================================================

export interface BillingPolicy {
  id: string;
  gracePeriodDays: number;
  pendingTtlMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export const BillingPolicySchema = z.object({
  id: z.string(),
  gracePeriodDays: z.number(),
  pendingTtlMinutes: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ============================================================================
// Action Codes (Canonical List)
// ============================================================================

export const BILLING_ACTION_CODES = [
  "CLUB_CREATE_EVENT",
  "CLUB_UPDATE_EVENT",
  "CLUB_CREATE_PAID_EVENT",
  "CLUB_EXPORT_PARTICIPANTS_CSV",
  "CLUB_INVITE_MEMBER",
  "CLUB_REMOVE_MEMBER",
  "CLUB_UPDATE",
] as const;

export type BillingActionCode = typeof BILLING_ACTION_CODES[number];

export interface BillingPolicyAction {
  policyId: string;
  status: SubscriptionStatus;
  action: BillingActionCode;
  isAllowed: boolean;
}

export const BillingPolicyActionSchema = z.object({
  policyId: z.string(),
  status: z.enum(SUBSCRIPTION_STATUSES),
  action: z.enum(BILLING_ACTION_CODES),
  isAllowed: z.boolean(),
});

// ============================================================================
// Transaction Types
// ============================================================================

export const TRANSACTION_STATUSES = ["pending", "paid", "failed", "refunded"] as const;
export type TransactionStatus = typeof TRANSACTION_STATUSES[number];

export interface BillingTransaction {
  id: string;
  clubId: string;
  planId: PlanId;
  provider: string;  // kaspi | epay | manual
  providerPaymentId: string | null;
  amountKzt: number;
  currency: string;
  status: TransactionStatus;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

export const BillingTransactionSchema = z.object({
  id: z.string().uuid(),
  clubId: z.string().uuid(),
  planId: z.enum(PLAN_IDS),
  provider: z.string(),
  providerPaymentId: z.string().nullable(),
  amountKzt: z.number(),
  currency: z.string(),
  status: z.enum(TRANSACTION_STATUSES),
  periodStart: z.string().nullable(),
  periodEnd: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ============================================================================
// Free Plan (hardcoded, not in DB)
// ============================================================================

export const FREE_LIMITS = {
  maxEventParticipants: 15,
  allowPaidEvents: false,
  allowCsvExport: false,
} as const;

// ============================================================================
// Paywall Types
// ============================================================================

export const PAYWALL_REASONS = [
  "CLUB_CREATION_REQUIRES_PLAN",
  "SUBSCRIPTION_EXPIRED",
  "SUBSCRIPTION_NOT_ACTIVE",
  "PAID_EVENTS_NOT_ALLOWED",
  "CSV_EXPORT_NOT_ALLOWED",
  "MAX_EVENT_PARTICIPANTS_EXCEEDED",
  "MAX_CLUB_MEMBERS_EXCEEDED",
] as const;

export type PaywallReason = typeof PAYWALL_REASONS[number];

export interface PaywallError {
  code: "PAYWALL";
  reason: PaywallReason;
  currentPlanId?: PlanId | "free";
  requiredPlanId?: PlanId;
  meta?: Record<string, unknown>;
  cta: {
    type: "OPEN_PRICING";
    href: "/pricing";
  };
}

export const PaywallErrorSchema = z.object({
  code: z.literal("PAYWALL"),
  reason: z.enum(PAYWALL_REASONS),
  currentPlanId: z.enum([...PLAN_IDS, "free"]).optional(),
  requiredPlanId: z.enum(PLAN_IDS).optional(),
  meta: z.record(z.unknown()).optional(),
  cta: z.object({
    type: z.literal("OPEN_PRICING"),
    href: z.literal("/pricing"),
  }),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine required plan ID based on requested participants count
 */
export function getRequiredPlanForParticipants(count: number): PlanId | "free" {
  if (count <= 15) return "free";
  if (count <= 50) return "club_50";
  if (count <= 500) return "club_500";
  return "club_unlimited";
}

/**
 * Determine required plan ID based on club members count
 */
export function getRequiredPlanForMembers(count: number): PlanId {
  if (count <= 50) return "club_50";
  if (count <= 500) return "club_500";
  return "club_unlimited";
}

/**
 * Check if subscription is in active state (active or grace)
 */
export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return status === "active" || status === "grace";
}
