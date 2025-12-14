import { z } from "zod";
import { CityHydrated } from "./city";

// ============================================================================
// Club Types
// ============================================================================

export const clubRoleSchema = z.enum(["owner", "organizer", "member", "pending"]);
export type ClubRole = z.infer<typeof clubRoleSchema>;

// DEPRECATED: Old billing system plan types
// Use @/lib/types/billing for new v2.0 types
// export const clubPlanSchema = z.enum(["club_free", "club_basic", "club_pro"]);
// export type ClubPlan = z.infer<typeof clubPlanSchema>;

// ============================================================================
// Club Interface
// ============================================================================

export interface Club {
  id: string;
  name: string;
  description: string | null;
  cityIds?: string[]; // FK array на cities table (from club_cities)
  cities?: CityHydrated[]; // Hydrated cities info
  logoUrl: string | null;
  telegramUrl: string | null;
  websiteUrl: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Club Member Interface
// ============================================================================

export interface ClubMember {
  clubId: string;
  userId: string;
  role: ClubRole;
  invitedBy: string | null;
  joinedAt: string;
}

// Extended with user info (for hydrated queries)
export interface ClubMemberWithUser extends ClubMember {
  user: {
    id: string;
    name: string;
    telegramHandle: string | null;
    avatarUrl: string | null;
  };
}

// ============================================================================
// Club Subscription Interface (DEPRECATED - use @/lib/types/billing)
// ============================================================================

// DEPRECATED: Old subscription type
// Use ClubSubscription from @/lib/types/billing for new v2.0
/*
export interface ClubSubscription {
  clubId: string;
  plan: ClubPlan;
  validUntil: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
*/

// Re-export new types for backward compatibility
export type { ClubSubscription, ClubPlan } from "@/lib/types/billing";

// ============================================================================
// Composite Types
// ============================================================================

// Full club details with members and subscription
export interface ClubWithDetails extends Club {
  subscription: ClubSubscription;
  members: ClubMemberWithUser[];
  memberCount: number;
  eventCount: number;
}

// Club with user's membership info (for "My Clubs" page)
export interface ClubWithMembership extends Club {
  userRole: ClubRole; // Role of the user in this club
  subscription: ClubSubscription;
  memberCount: number;
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

// Create Club
export const clubCreateSchema = z.object({
  name: z.string().trim().min(2, "Название должно быть не короче 2 символов").max(100, "Название слишком длинное"),
  description: z.string().trim().max(5000, "Описание слишком длинное").optional().nullable(),
  cityIds: z.array(z.string().uuid("Некорректный ID города")).min(1, "Выберите хотя бы один город").max(10, "Максимум 10 городов"),
  logoUrl: z.string().trim().url("Некорректный URL логотипа").max(500).optional().nullable(),
  telegramUrl: z.string().trim().url("Некорректный URL Telegram").max(500).optional().nullable(),
  websiteUrl: z.string().trim().url("Некорректный URL сайта").max(500).optional().nullable(),
  createdBy: z.string().uuid().optional().nullable(),
});

export type ClubCreateInput = z.infer<typeof clubCreateSchema>;

// Update Club
export const clubUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  cityIds: z.array(z.string().uuid("Некорректный ID города")).min(1, "Выберите хотя бы один город").max(10, "Максимум 10 городов").optional(),
  logoUrl: z.string().trim().url().max(500).optional().nullable(),
  telegramUrl: z.string().trim().url().max(500).optional().nullable(),
  websiteUrl: z.string().trim().url().max(500).optional().nullable(),
});

export type ClubUpdateInput = z.infer<typeof clubUpdateSchema>;

// Add Member
export const clubMemberAddSchema = z.object({
  clubId: z.string().uuid("Некорректный ID клуба"),
  userId: z.string().uuid("Некорректный ID пользователя"),
  role: clubRoleSchema.default("member"),
  invitedBy: z.string().uuid().optional().nullable(),
});

export type ClubMemberAddInput = z.infer<typeof clubMemberAddSchema>;

// Update Member Role
export const clubMemberRoleUpdateSchema = z.object({
  role: clubRoleSchema,
});

export type ClubMemberRoleUpdateInput = z.infer<typeof clubMemberRoleUpdateSchema>;

// Update Club Subscription
export const clubSubscriptionUpdateSchema = z.object({
  plan: clubPlanSchema,
  validUntil: z.string().datetime().optional().nullable(),
  active: z.boolean().optional(),
});

export type ClubSubscriptionUpdateInput = z.infer<typeof clubSubscriptionUpdateSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get localized label for club role
 */
export function getClubRoleLabel(role: ClubRole): string {
  const labels: Record<ClubRole, string> = {
    owner: "Владелец",
    organizer: "Организатор",
    member: "Участник",
    pending: "Ожидает подтверждения",
  };
  return labels[role];
}

/**
 * Get localized label for club plan (DEPRECATED)
 * Use new billing v2.0 system
 */
export function getClubPlanLabel(plan: string): string {
  // Legacy support for old plan IDs
  const labels: Record<string, string> = {
    club_free: "Бесплатный",
    club_basic: "Базовый",
    club_pro: "Про",
    // New v2.0 plan IDs
    free: "Бесплатный",
    club_50: "Club 50",
    club_500: "Club 500",
    club_unlimited: "Unlimited",
  };
  return labels[plan] || plan;
}

/**
 * Get plan features description (DEPRECATED)
 * Use new billing v2.0 system
 */
export function getClubPlanFeatures(plan: string): string[] {
  // Legacy support - return empty for now
  return [];
}

/**
 * Get max active events for plan (DEPRECATED)
 * Use new billing v2.0 system with maxEventParticipants
 */
export function getMaxActiveEventsForPlan(plan: string): number | null {
  return null; // Deprecated
}

/**
 * Check if user can manage club (owner or organizer)
 */
export function canManageClub(role: ClubRole | null): boolean {
  return role === "owner" || role === "organizer";
}

/**
 * Check if user can create events for club
 */
export function canCreateClubEvents(role: ClubRole | null): boolean {
  return role === "owner" || role === "organizer";
}

/**
 * Check if user can manage members (owner only)
 */
export function canManageMembers(role: ClubRole | null): boolean {
  return role === "owner";
}

/**
 * Check if subscription is active and not expired (DEPRECATED - legacy support)
 */
export function isSubscriptionActive(subscription: any): boolean {
  // Legacy support
  if (subscription.status) {
    // New v2.0 format
    return subscription.status === 'active' || subscription.status === 'grace';
  }
  // Old format
  if (!subscription.active) return false;
  if (!subscription.validUntil) return true;
  return new Date(subscription.validUntil) > new Date();
}

/**
 * Get days until subscription expires
 */
export function getDaysUntilExpiration(subscription: ClubSubscription): number | null {
  if (!subscription.validUntil) return null; // No expiration
  const now = new Date();
  const expiration = new Date(subscription.validUntil);
  const diffMs = expiration.getTime() - now.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

