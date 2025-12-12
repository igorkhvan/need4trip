import { supabase } from "@/lib/db/client";
import { InternalError, NotFoundError } from "@/lib/errors";
import type { ClubRole } from "@/lib/types/club";

const table = "club_members";

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

export interface DbClubMember {
  club_id: string;
  user_id: string;
  role: ClubRole;
  invited_by: string | null;
  joined_at: string;
}

export interface DbClubMemberWithUser extends DbClubMember {
  user: {
    id: string;
    name: string;
    telegram_handle: string | null;
    avatar_url: string | null;
  };
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Add member to club
 */
export async function addMember(
  clubId: string,
  userId: string,
  role: ClubRole,
  invitedBy: string | null = null
): Promise<DbClubMember> {
  const client = ensureClient();
  if (!client) {
    throw new InternalError("Supabase client is not configured");
  }

  const insertPayload = {
    club_id: clubId,
    user_id: userId,
    role,
    invited_by: invitedBy,
    joined_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from(table)
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to add club member", error);
    throw new InternalError("Failed to add club member", error);
  }

  return data as DbClubMember;
}

/**
 * Get member by club and user ID
 */
export async function getMember(
  clubId: string,
  userId: string
): Promise<DbClubMember | null> {
  const client = ensureClient();
  if (!client) return null;

  const { data, error } = await client
    .from(table)
    .select("*")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to get club member", error);
    throw new InternalError("Failed to get club member", error);
  }

  return data ? (data as DbClubMember) : null;
}

/**
 * Get member with user info
 */
export async function getMemberWithUser(
  clubId: string,
  userId: string
): Promise<DbClubMemberWithUser | null> {
  const client = ensureClient();
  if (!client) return null;

  const { data, error } = await client
    .from(table)
    .select("*, user:users!user_id(id, name, telegram_handle, avatar_url)")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to get club member with user", error);
    throw new InternalError("Failed to get club member", error);
  }

  return data ? (data as DbClubMemberWithUser) : null;
}

/**
 * List all members of a club
 */
export async function listMembers(clubId: string): Promise<DbClubMember[]> {
  const client = ensureClient();
  if (!client) return [];

  const { data, error } = await client
    .from(table)
    .select("*")
    .eq("club_id", clubId)
    .order("joined_at", { ascending: true });

  if (error) {
    console.error("Failed to list club members", error);
    throw new InternalError("Failed to list club members", error);
  }

  return (data ?? []) as DbClubMember[];
}

/**
 * List members with user info
 */
export async function listMembersWithUser(
  clubId: string
): Promise<DbClubMemberWithUser[]> {
  const client = ensureClient();
  if (!client) return [];

  const { data, error } = await client
    .from(table)
    .select("*, user:users!user_id(id, name, telegram_handle, avatar_url)")
    .eq("club_id", clubId)
    .order("joined_at", { ascending: true });

  if (error) {
    console.error("Failed to list club members with users", error);
    throw new InternalError("Failed to list club members", error);
  }

  return (data ?? []) as DbClubMemberWithUser[];
}

/**
 * List clubs for a user
 */
export async function listUserClubs(userId: string): Promise<string[]> {
  const client = ensureClient();
  if (!client) return [];

  const { data, error } = await client
    .from(table)
    .select("club_id")
    .eq("user_id", userId)
    .neq("role", "pending"); // Exclude pending memberships

  if (error) {
    console.error("Failed to list user clubs", error);
    throw new InternalError("Failed to list user clubs", error);
  }

  return (data ?? []).map((row) => row.club_id);
}

/**
 * List clubs for a user with role info
 */
export async function listUserClubsWithRole(userId: string): Promise<DbClubMember[]> {
  const client = ensureClient();
  if (!client) return [];

  const { data, error } = await client
    .from(table)
    .select("*")
    .eq("user_id", userId)
    .neq("role", "pending")
    .order("joined_at", { ascending: false });

  if (error) {
    console.error("Failed to list user clubs with role", error);
    throw new InternalError("Failed to list user clubs", error);
  }

  return (data ?? []) as DbClubMember[];
}

/**
 * Update member role
 */
export async function updateMemberRole(
  clubId: string,
  userId: string,
  role: ClubRole
): Promise<DbClubMember | null> {
  const client = ensureClient();
  if (!client) {
    throw new InternalError("Supabase client is not configured");
  }

  const { data, error } = await client
    .from(table)
    .update({ role })
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("Failed to update member role", error);
    throw new InternalError("Failed to update member role", error);
  }

  return data ? (data as DbClubMember) : null;
}

/**
 * Remove member from club
 */
export async function removeMember(clubId: string, userId: string): Promise<boolean> {
  const client = ensureClient();
  if (!client) {
    throw new InternalError("Supabase client is not configured");
  }

  const { error, count } = await client
    .from(table)
    .delete({ count: "exact" })
    .eq("club_id", clubId)
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to remove club member", error);
    throw new InternalError("Failed to remove club member", error);
  }

  if ((count ?? 0) === 0) {
    throw new NotFoundError("Club member not found");
  }

  return true;
}

/**
 * List pending members (waiting for approval)
 */
export async function listPendingMembers(clubId: string): Promise<DbClubMemberWithUser[]> {
  const client = ensureClient();
  if (!client) return [];

  const { data, error } = await client
    .from(table)
    .select("*, user:users!user_id(id, name, telegram_handle, avatar_url)")
    .eq("club_id", clubId)
    .eq("role", "pending")
    .order("joined_at", { ascending: true });

  if (error) {
    console.error("Failed to list pending members", error);
    throw new InternalError("Failed to list pending members", error);
  }

  return (data ?? []) as DbClubMemberWithUser[];
}

/**
 * Approve pending member (change role from 'pending' to 'member')
 */
export async function approveMember(
  clubId: string,
  userId: string
): Promise<DbClubMember | null> {
  return updateMemberRole(clubId, userId, "member");
}

/**
 * Count members by role
 */
export async function countMembersByRole(
  clubId: string,
  role: ClubRole
): Promise<number> {
  const client = ensureClient();
  if (!client) return 0;

  const { count, error } = await client
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("club_id", clubId)
    .eq("role", role);

  if (error) {
    console.error("Failed to count members by role", error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Count total members (excluding pending)
 */
export async function countMembers(clubId: string): Promise<number> {
  const client = ensureClient();
  if (!client) return 0;

  const { count, error } = await client
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("club_id", clubId)
    .neq("role", "pending");

  if (error) {
    console.error("Failed to count club members", error);
    return 0;
  }

  return count ?? 0;
}

