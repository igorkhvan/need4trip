import { z } from "zod";
import { CityHydrated } from "./city";
import { ClubSubscription } from "./billing";

// ============================================================================
// Club Types
// ============================================================================

// SSOT: docs/SSOT_CLUBS_EVENTS_ACCESS.md §2
// Canonical club roles: owner, admin, member, pending
// 'organizer' is deprecated and must not exist
export const clubRoleSchema = z.enum(["owner", "admin", "member", "pending"]);
export type ClubRole = z.infer<typeof clubRoleSchema>;


// Club settings stored in JSONB (snake_case in DB, camelCase in domain)
// Per SSOT_CLUBS_DOMAIN.md §8.4
export interface ClubSettings {
  publicMembersListEnabled?: boolean;   // §8.4.1
  publicShowOwnerBadge?: boolean;       // §8.4.2
  openJoinEnabled?: boolean;            // §8.4.4 (RESERVED / PLANNED)
}

export interface Club {
  id: string;
  slug: string;
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
  archivedAt: string | null; // NULL = active, NOT NULL = archived (soft-delete)
  // Owner-only fields (per SSOT_CLUBS_DOMAIN.md §8.1)
  visibility: 'public' | 'private';     // §4.1
  settings: ClubSettings;               // §8.4
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
// Club Invite Interface
// ============================================================================

export type ClubInviteStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export interface ClubInvite {
  id: string;
  clubId: string;
  invitedByUserId: string;
  inviteeUserId: string | null;
  status: ClubInviteStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Club Join Request Interface
// ============================================================================

export type ClubJoinRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired';

export interface ClubJoinRequest {
  id: string;
  clubId: string;
  requesterUserId: string;
  status: ClubJoinRequestStatus;
  message: string | null;
  createdAt: string;
  updatedAt: string;
  // Optional user data (included in list responses)
  user?: {
    id: string;
    name: string;
    telegramHandle: string | null;
    avatarUrl: string | null;
  };
}

// ============================================================================
// Club Subscription Interface
// ============================================================================

// Import new v2.0 types
export type { ClubSubscription } from "@/lib/types/billing";
export type { ClubPlan as ClubPlanObject } from "@/lib/types/billing";

// ============================================================================
// Composite Types
// ============================================================================

// Full club details with members and subscription
export interface ClubWithDetails extends Club {
  subscription: ClubSubscription | null;  // null = free plan (no subscription)
  members: ClubMemberWithUser[];
  memberCount: number;
  eventCount: number;
}

// Club with user's membership info (for "My Clubs" page)
export interface ClubWithMembership extends Club {
  userRole: ClubRole; // Role of the user in this club
  subscription: ClubSubscription | null;  // null = free plan (no subscription)
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

// Club visibility enum (matches DB enum `club_visibility`)
// Per SSOT_CLUBS_DOMAIN.md §4.1
export const clubVisibilitySchema = z.enum(["public", "private"]);
export type ClubVisibility = z.infer<typeof clubVisibilitySchema>;

// Club settings schema (partial, for updates)
// Per SSOT_CLUBS_DOMAIN.md §8.4
export const clubSettingsUpdateSchema = z.object({
  // §8.4.1: public_members_list_enabled
  publicMembersListEnabled: z.boolean().optional(),
  // §8.4.2: public_show_owner_badge
  publicShowOwnerBadge: z.boolean().optional(),
  // §8.4.4: open_join_enabled (RESERVED/PLANNED)
  openJoinEnabled: z.boolean().optional(),
}).strict();

export type ClubSettingsUpdate = z.infer<typeof clubSettingsUpdateSchema>;

// Update Club
// Per SSOT_CLUBS_DOMAIN.md §8.1:
// - Owner + Admin: name, description, cityIds, logoUrl, telegramUrl, websiteUrl
// - Owner-only: visibility, settings
export const clubUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  cityIds: z.array(z.string().uuid("Некорректный ID города")).min(1, "Выберите хотя бы один город").max(10, "Максимум 10 городов").optional(),
  logoUrl: z.string().trim().url().max(500).optional().nullable(),
  telegramUrl: z.string().trim().url().max(500).optional().nullable(),
  websiteUrl: z.string().trim().url().max(500).optional().nullable(),
  // Owner-only fields (per §8.1)
  visibility: clubVisibilitySchema.optional(),
  settings: clubSettingsUpdateSchema.optional(),
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

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get localized label for club role
 */
export function getClubRoleLabel(role: ClubRole): string {
  const labels: Record<ClubRole, string> = {
    owner: "Владелец",
    admin: "Администратор",
    member: "Участник",
    pending: "Ожидает подтверждения",
  };
  return labels[role];
}

/**
 * Get localized label for club plan
 * Simple mapping for display purposes
 */
export function getClubPlanLabel(plan: string): string {
  const labels: Record<string, string> = {
    free: "Бесплатный",
    club_50: "Club 50",
    club_500: "Club 500",
    club_unlimited: "Unlimited",
  };
  return labels[plan] || plan;
}

/**
 * Check if user can manage club page content (owner or admin)
 * SSOT §6.1: Owner and Admin may edit club page content
 */
export function canManageClub(role: ClubRole | null): boolean {
  return role === "owner" || role === "admin";
}

/**
 * Check if user can create events for club (owner or admin)
 * SSOT §4.2: Club dropdown options = clubs where user role ∈ {owner, admin}
 */
export function canCreateClubEvents(role: ClubRole | null): boolean {
  return role === "owner" || role === "admin";
}

/**
 * Check if user can manage members (owner only)
 */
export function canManageMembers(role: ClubRole | null): boolean {
  return role === "owner";
}


/**
 * Get days until subscription expires
 */
export function getDaysUntilExpiration(subscription: ClubSubscription): number | null {
  if (!subscription.currentPeriodEnd) return null; // No expiration
  const now = new Date();
  const expiration = new Date(subscription.currentPeriodEnd);
  const diffMs = expiration.getTime() - now.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

