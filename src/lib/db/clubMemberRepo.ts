import { getAdminDb } from "@/lib/db/client";
import { InternalError, NotFoundError } from "@/lib/errors";
import type { ClubRole } from "@/lib/types/club";
import { log } from "@/lib/utils/logger";

const table = "club_members";

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
  const db = getAdminDb();

  const insertPayload: {
    club_id: string;
    user_id: string;
    role: string;
    invited_by: string | null;
  } = {
    club_id: clubId,
    user_id: userId,
    role: role as string, // Cast to string for Supabase
    invited_by: invitedBy,
    // joined_at will be set by DB DEFAULT NOW()
  };

  const { data, error } = await db
    .from(table)
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    log.error("Failed to add club member", { error });
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
  const db = getAdminDb();

  const { data, error } = await db
    .from(table)
    .select("*")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    log.error("Failed to get club member", { clubId, userId, error });
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
  const db = getAdminDb();

  const { data, error } = await db
    .from(table)
    .select("*, user:users!user_id(id, name, telegram_handle, avatar_url)")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    log.error("Failed to get club member with user", { clubId, userId, error });
    throw new InternalError("Failed to get club member", error);
  }

  return data ? (data as DbClubMemberWithUser) : null;
}

/**
 * List all members of a club
 */
export async function listMembers(clubId: string): Promise<DbClubMember[]> {
  const db = getAdminDb();

  const { data, error } = await db
    .from(table)
    .select("*")
    .eq("club_id", clubId)
    .order("joined_at", { ascending: true });

  if (error) {
    log.error("Failed to list club members", { clubId, error });
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
  const db = getAdminDb();

  const { data, error } = await db
    .from(table)
    .select("*, user:users!user_id(id, name, telegram_handle, avatar_url)")
    .eq("club_id", clubId)
    .order("joined_at", { ascending: true });

  if (error) {
    log.error("Failed to list club members with users", { clubId, error });
    throw new InternalError("Failed to list club members", error);
  }

  return (data ?? []) as DbClubMemberWithUser[];
}

/**
 * List clubs for a user
 */
export async function listUserClubs(userId: string): Promise<string[]> {
  const db = getAdminDb();

  const { data, error } = await db
    .from(table)
    .select("club_id")
    .eq("user_id", userId)
    .neq("role", "pending"); // Exclude pending memberships

  if (error) {
    log.error("Failed to list user clubs", { userId, error });
    throw new InternalError("Failed to list user clubs", error);
  }

  return (data ?? []).map((row: any) => row.club_id);
}

/**
 * List clubs for a user with role info
 */
export async function listUserClubsWithRole(userId: string): Promise<DbClubMember[]> {
  const db = getAdminDb();

  const { data, error } = await db
    .from(table)
    .select("*")
    .eq("user_id", userId)
    .neq("role", "pending")
    .order("joined_at", { ascending: false });

  if (error) {
    log.error("Failed to list user clubs with role", { userId, error });
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
  const db = getAdminDb();

  const { data, error } = await db
    .from(table)
    .update({ role: role as string })
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  if (error) {
    log.error("Failed to update member role", { clubId, userId, role, error });
    throw new InternalError("Failed to update member role", error);
  }

  return data ? (data as DbClubMember) : null;
}

/**
 * Remove member from club
 */
export async function removeMember(clubId: string, userId: string): Promise<boolean> {
  const db = getAdminDb();

  const { error, count } = await db
    .from(table)
    .delete({ count: "exact" })
    .eq("club_id", clubId)
    .eq("user_id", userId);

  if (error) {
    log.error("Failed to remove club member", { clubId, userId, error });
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
  const db = getAdminDb();

  const { data, error } = await db
    .from(table)
    .select("*, user:users!user_id(id, name, telegram_handle, avatar_url)")
    .eq("club_id", clubId)
    .eq("role", "pending")
    .order("joined_at", { ascending: true });

  if (error) {
    log.error("Failed to list pending members", { clubId, error });
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
  const db = getAdminDb();

  const { count, error } = await db
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("club_id", clubId)
    .eq("role", role as string);

  if (error) {
    log.error("Failed to count members by role", { clubId, role, error });
    return 0;
  }

  return count ?? 0;
}

/**
 * Count total members (excluding pending)
 */
export async function countMembers(clubId: string): Promise<number> {
  const db = getAdminDb();

  const { count, error } = await db
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("club_id", clubId)
    .neq("role", "pending");

  if (error) {
    log.error("Failed to count club members", { clubId, error });
    return 0;
  }

  return count ?? 0;
}

/**
 * Count members (excluding pending) for multiple clubs at once (batch query)
 */
export async function countMembersByClubIds(clubIds: string[]): Promise<Map<string, number>> {
  if (clubIds.length === 0) return new Map();
  
  const db = getAdminDb();
  
  // Use group by to count members per club
  const { data, error } = await db
    .from(table)
    .select("club_id")
    .in("club_id", clubIds)
    .neq("role", "pending");
  
  if (error) {
    log.error("Failed to count members for clubs", { clubIds, error });
    return new Map();
  }
  
  // Count manually (Supabase doesn't support GROUP BY in SDK)
  const counts = new Map<string, number>();
  clubIds.forEach(id => counts.set(id, 0)); // Initialize all to 0
  
  (data ?? []).forEach((row: any) => {
    const clubId = row.club_id;
    counts.set(clubId, (counts.get(clubId) ?? 0) + 1);
  });
  
  return counts;
}

/**
 * Check if user is a club member (excluding pending)
 */
export async function isClubMember(clubId: string, userId: string): Promise<boolean> {
  const member = await getMember(clubId, userId);
  return member !== null && member.role !== "pending";
}

