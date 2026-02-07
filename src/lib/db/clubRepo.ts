import { getAdminDb } from "@/lib/db/client";
import { InternalError, NotFoundError } from "@/lib/errors";
import type { ClubCreateInput, ClubUpdateInput } from "@/lib/types/club";
import { log } from "@/lib/utils/logger";

const table = "clubs";

// Explicit column list for select queries (performance optimization)
// Explicit column list for select queries (performance optimization)
const CLUB_COLUMNS = "id, name, slug, visibility, owner_user_id, settings, description, logo_url, telegram_url, website_url, created_by, created_at, updated_at, archived_at" as const;

// ============================================================================
// Database Types (snake_case)
// ============================================================================

export interface DbClub {
  id: string;
  name: string;
  slug: string;
  visibility: 'public' | 'private';
  owner_user_id: string | null;
  settings: Record<string, any>;
  description: string | null;
  logo_url: string | null;
  telegram_url: string | null;
  website_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null; // NULL = active, NOT NULL = archived (soft-delete)
}

export interface DbClubWithOwner extends DbClub {
  created_by_user: {
    id: string;
    name: string;
    telegram_handle: string | null;
  } | null;
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * List all clubs with pagination
 * Per SSOT_CLUBS_DOMAIN.md §8.3: Excludes archived clubs from public listings
 */
export async function listClubs(page = 1, limit = 12): Promise<{
  data: DbClub[];
  total: number;
  hasMore: boolean;
}> {
  const db = getAdminDb();

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await db
    .from(table)
    .select(CLUB_COLUMNS, { count: "exact" })
    .is("archived_at", null) // Exclude archived clubs
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    log.error("Failed to list clubs", { error });
    throw new InternalError("Failed to list clubs", error);
  }

  return {
    data: (data ?? []) as DbClub[],
    total: count ?? 0,
    hasMore: (count ?? 0) > to + 1,
  };
}

/**
 * List clubs with owner info
 * Per SSOT_CLUBS_DOMAIN.md §8.3: Excludes archived clubs from listings
 */
export async function listClubsWithOwner(): Promise<DbClubWithOwner[]> {
  const db = getAdminDb();

  const { data, error} = await db
    .from(table)
    .select("*, created_by_user:users!created_by(id, name, telegram_handle)")
    .is("archived_at", null) // Exclude archived clubs
    .order("created_at", { ascending: false });

  if (error) {
    log.error("Failed to list clubs with owner", { error });
    throw new InternalError("Failed to list clubs", error);
  }

  return (data ?? []) as DbClubWithOwner[];
}

/**
 * Get club by ID
 */
export async function getClubById(id: string): Promise<DbClub | null> {
  const db = getAdminDb();

  if (!id || !/^[0-9a-fA-F-]{36}$/.test(id)) {
    log.warn("Invalid club id provided", { id });
    return null;
  }

  const { data, error } = await db
    .from(table)
    .select(CLUB_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    log.error("Failed to get club", { clubId: id, error });
    throw new InternalError("Failed to get club", error);
  }

  return data ? (data as DbClub) : null;
}

/**
 * Get club with owner info
 */
export async function getClubWithOwner(id: string): Promise<DbClubWithOwner | null> {
  const db = getAdminDb();

  if (!id || !/^[0-9a-fA-F-]{36}$/.test(id)) {
    log.warn("Invalid club id provided", { id });
    return null;
  }

  const { data, error } = await db
    .from(table)
    .select("*, created_by_user:users!created_by(id, name, telegram_handle)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    log.error("Failed to get club with owner", { clubId: id, error });
    throw new InternalError("Failed to get club", error);
  }

  return data ? (data as DbClubWithOwner) : null;
}

/**
 * Create new club (legacy path — no entitlement consumption).
 * Used when entitlement check is bypassed (e.g. admin) or for backwards compatibility.
 */
export async function createClub(payload: ClubCreateInput): Promise<DbClub> {
  const db = getAdminDb();

  const now = new Date().toISOString();

  const insertPayload = {
    name: payload.name,
    slug: payload.name.toLowerCase().replace(/\s+/g, '-'),
    description: payload.description ?? null,
    logo_url: payload.logoUrl ?? null,
    telegram_url: payload.telegramUrl ?? null,
    website_url: payload.websiteUrl ?? null,
    created_by: payload.createdBy ?? null,
    owner_user_id: payload.createdBy ?? null,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await db
    .from(table)
    .insert(insertPayload)
    .select(CLUB_COLUMNS)
    .single();

  if (error) {
    log.error("Failed to create club", { error });
    throw new InternalError("Failed to create club", error);
  }

  const club = data as DbClub;

  // Insert city associations
  if (payload.cityIds && payload.cityIds.length > 0) {
    await updateClubCities(club.id, payload.cityIds);
  }

  return club;
}

/**
 * Create club by consuming a pre-club subscription entitlement (atomic).
 * ADR-002: Claims entitlement, creates club, consumes entitlement, creates club_subscriptions.
 *
 * @throws PostgrestError with code/message when entitlement not found (map to PaywallError)
 */
export async function createClubConsumingEntitlement(
  userId: string,
  payload: ClubCreateInput
): Promise<DbClub> {
  const db = getAdminDb();

  const { data, error } = await db.rpc("create_club_consuming_entitlement", {
    p_user_id: userId,
    p_name: payload.name.trim(),
    p_description: payload.description?.trim() ?? null,
    p_logo_url: payload.logoUrl?.trim() ?? null,
    p_telegram_url: payload.telegramUrl?.trim() ?? null,
    p_website_url: payload.websiteUrl?.trim() ?? null,
    p_city_ids: payload.cityIds ?? [],
  });

  if (error) {
    log.error("create_club_consuming_entitlement failed", { userId, error });
    throw error;
  }

  const club = Array.isArray(data) && data.length > 0 ? (data[0] as DbClub) : null;
  if (!club) {
    log.error("create_club_consuming_entitlement returned no club", { userId });
    throw new InternalError("Failed to create club");
  }

  return club;
}

/**
 * Update club
 * 
 * Per SSOT_CLUBS_DOMAIN.md §8.1:
 * - visibility and settings are owner-only (enforced at service layer)
 * - settings is merged with existing values to preserve unmodified fields
 */
export async function updateClub(
  id: string,
  payload: ClubUpdateInput
): Promise<DbClub | null> {
  const db = getAdminDb();

  // Build base patch (content fields)
  const patch: Record<string, unknown> = {
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.description !== undefined ? { description: payload.description } : {}),
    ...(payload.logoUrl !== undefined ? { logo_url: payload.logoUrl } : {}),
    ...(payload.telegramUrl !== undefined ? { telegram_url: payload.telegramUrl } : {}),
    ...(payload.websiteUrl !== undefined ? { website_url: payload.websiteUrl } : {}),
    // Owner-only: visibility (direct column)
    ...(payload.visibility !== undefined ? { visibility: payload.visibility } : {}),
    updated_at: new Date().toISOString(),
  };

  // Owner-only: settings (JSONB merge)
  // Per SSOT_CLUBS_DOMAIN.md §8.4: Merge with existing to preserve unmodified fields
  if (payload.settings !== undefined) {
    // Fetch current settings to merge
    const { data: current, error: fetchError } = await db
      .from(table)
      .select("settings")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      log.error("Failed to fetch club settings for merge", { clubId: id, error: fetchError });
      throw new InternalError("Failed to update club settings", fetchError);
    }

    const existingSettings = (current?.settings as Record<string, unknown>) ?? {};
    
    // Map camelCase to snake_case for DB storage
    const settingsUpdate: Record<string, unknown> = {};
    if (payload.settings.publicMembersListEnabled !== undefined) {
      settingsUpdate.public_members_list_enabled = payload.settings.publicMembersListEnabled;
    }
    if (payload.settings.publicShowOwnerBadge !== undefined) {
      settingsUpdate.public_show_owner_badge = payload.settings.publicShowOwnerBadge;
    }
    if (payload.settings.openJoinEnabled !== undefined) {
      settingsUpdate.open_join_enabled = payload.settings.openJoinEnabled;
    }

    // Merge: existing settings + new updates
    patch.settings = { ...existingSettings, ...settingsUpdate };
  }

  const { data, error } = await db
    .from(table)
    .update(patch)
    .eq("id", id)
    .select(CLUB_COLUMNS)
    .maybeSingle();

  if (error) {
    log.error("Failed to update club", { clubId: id, error });
    throw new InternalError("Failed to update club", error);
  }

  // Update city associations if provided
  if (payload.cityIds !== undefined) {
    await updateClubCities(id, payload.cityIds);
  }

  return data ? (data as DbClub) : null;
}

/**
 * Archive club (soft-delete)
 * Per SSOT_CLUBS_DOMAIN.md §8.3: Sets archived_at timestamp
 * Idempotent: if already archived, returns success without side effects
 */
export async function archiveClub(id: string): Promise<boolean> {
  const db = getAdminDb();

  const now = new Date().toISOString();

  // Use upsert-like behavior: only set archived_at if currently NULL
  const { data, error } = await db
    .from(table)
    .update({ 
      archived_at: now,
      updated_at: now 
    })
    .eq("id", id)
    .is("archived_at", null) // Only archive if not already archived
    .select("id")
    .maybeSingle();

  if (error) {
    log.error("Failed to archive club", { clubId: id, error });
    throw new InternalError("Failed to archive club", error);
  }

  // If no rows updated, check if club exists (might be already archived)
  if (!data) {
    const existing = await getClubById(id);
    if (!existing) {
      throw new NotFoundError("Club not found");
    }
    // Club exists but was already archived - idempotent success
    log.info("Club already archived (idempotent)", { clubId: id });
    return true;
  }

  log.info("Club archived", { clubId: id, archivedAt: now });
  return true;
}

/**
 * Unarchive club (restore from archive)
 * Per SSOT_CLUBS_DOMAIN.md §8.3.1: Owner-only, if supported
 * Idempotent: if already active, returns success
 */
export async function unarchiveClub(id: string): Promise<boolean> {
  const db = getAdminDb();

  const now = new Date().toISOString();

  // Only unarchive if currently archived
  const { data, error } = await db
    .from(table)
    .update({ 
      archived_at: null,
      updated_at: now 
    })
    .eq("id", id)
    .not("archived_at", "is", null) // Only unarchive if currently archived
    .select("id")
    .maybeSingle();

  if (error) {
    log.error("Failed to unarchive club", { clubId: id, error });
    throw new InternalError("Failed to unarchive club", error);
  }

  // If no rows updated, check if club exists (might be already active)
  if (!data) {
    const existing = await getClubById(id);
    if (!existing) {
      throw new NotFoundError("Club not found");
    }
    // Club exists but was already active - idempotent success
    log.info("Club already active (idempotent)", { clubId: id });
    return true;
  }

  log.info("Club unarchived", { clubId: id });
  return true;
}

/**
 * Check if club is archived
 * Returns true if archived_at IS NOT NULL
 */
export async function isClubArchived(id: string): Promise<boolean> {
  const db = getAdminDb();

  const { data, error } = await db
    .from(table)
    .select("archived_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    log.error("Failed to check club archived status", { clubId: id, error });
    throw new InternalError("Failed to check club archived status", error);
  }

  if (!data) {
    throw new NotFoundError("Club not found");
  }

  return data.archived_at !== null;
}

/**
 * List clubs created by user
 */
export async function listClubsByCreator(userId: string): Promise<DbClub[]> {
  const db = getAdminDb();

  const { data, error } = await db
    .from(table)
    .select(CLUB_COLUMNS)
    .eq("created_by", userId)
    .order("created_at", { ascending: false });

  if (error) {
    log.error("Failed to list clubs by creator", { userId, error });
    throw new InternalError("Failed to list clubs", error);
  }

  return (data ?? []) as DbClub[];
}

/**
 * Search clubs by name with pagination
 * Per SSOT_CLUBS_DOMAIN.md §8.3: Excludes archived clubs from search results
 */
export async function searchClubs(query: string, page = 1, limit = 12): Promise<{
  data: DbClub[];
  total: number;
  hasMore: boolean;
}> {
  const db = getAdminDb();

  const searchPattern = `%${query}%`;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await db
    .from(table)
    .select(CLUB_COLUMNS, { count: "exact" })
    .ilike("name", searchPattern)
    .is("archived_at", null) // Exclude archived clubs
    .order("name", { ascending: true })
    .range(from, to);

  if (error) {
    log.error("Failed to search clubs", { query, error });
    throw new InternalError("Failed to search clubs", error);
  }

  return {
    data: (data ?? []) as DbClub[],
    total: count ?? 0,
    hasMore: (count ?? 0) > to + 1,
  };
}

/**
 * Count clubs created by user
 */
export async function countClubsByUserId(userId: string): Promise<number> {
  const db = getAdminDb();

  const { count, error } = await db
    .from(table)
    .select(CLUB_COLUMNS, { count: "exact", head: true })
    .eq("created_by", userId);

  if (error) {
    log.error("Failed to count clubs by user", { userId, error });
    return 0;
  }

  return count ?? 0;
}

// ============================================================================
// Club Cities (Many-to-Many)
// ============================================================================

/**
 * Get city IDs for a club
 */
export async function getClubCityIds(clubId: string): Promise<string[]> {
  const db = getAdminDb();

  const { data, error } = await db
    .from("club_cities")
    .select("city_id")
    .eq("club_id", clubId)
    .order("created_at", { ascending: true });

  if (error) {
    log.error("Failed to get city IDs for club", { clubId, error });
    return [];
  }

  return (data ?? []).map((row: any) => row.city_id);
}

/**
 * Get city IDs for multiple clubs (batch)
 */
export async function getClubsCityIds(clubIds: string[]): Promise<Map<string, string[]>> {
  const db = getAdminDb();

  if (clubIds.length === 0) return new Map();

  const { data, error } = await db
    .from("club_cities")
    .select("club_id, city_id")
    .in("club_id", clubIds)
    .order("created_at", { ascending: true });

  if (error) {
    log.error("Failed to batch get club city IDs", { clubCount: clubIds.length, error });
    return new Map();
  }

  // Group by club_id
  const map = new Map<string, string[]>();
  for (const row of data ?? []) {
    const clubId = row.club_id;
    const cityId = row.city_id;
    if (!map.has(clubId)) {
      map.set(clubId, []);
    }
    map.get(clubId)!.push(cityId);
  }

  return map;
}

/**
 * Update club cities (replace all)
 */
export async function updateClubCities(clubId: string, cityIds: string[]): Promise<void> {
  const db = getAdminDb();

  // Delete existing associations
  const { error: deleteError } = await db
    .from("club_cities")
    .delete()
    .eq("club_id", clubId);

  if (deleteError) {
    log.error("Failed to delete club cities", { clubId, error: deleteError });
    throw new InternalError("Failed to update club cities", deleteError);
  }

  // Insert new associations if any
  if (cityIds.length > 0) {
    const insertPayload = cityIds.map((cityId) => ({
      club_id: clubId,
      city_id: cityId,
      created_at: new Date().toISOString(),
    }));

    const { error: insertError } = await db
      .from("club_cities")
      .insert(insertPayload);

    if (insertError) {
      log.error("Failed to insert club cities", { clubId, cityCount: cityIds.length, error: insertError });
      throw new InternalError("Failed to update club cities", insertError);
    }
  }
}

/**
 * List clubs by city (filter) with pagination
 * Per SSOT_CLUBS_DOMAIN.md §8.3: Excludes archived clubs from listings
 */
export async function listClubsByCity(cityId: string, page = 1, limit = 12): Promise<{
  data: DbClub[];
  total: number;
  hasMore: boolean;
}> {
  const db = getAdminDb();

  // Get club IDs that have this city
  const { data: clubCitiesData, error: clubCitiesError } = await db
    .from("club_cities")
    .select("club_id")
    .eq("city_id", cityId);

  if (clubCitiesError) {
    log.error("Failed to get clubs by city", { cityId, error: clubCitiesError });
    throw new InternalError("Failed to list clubs by city", clubCitiesError);
  }

  if (!clubCitiesData || clubCitiesData.length === 0) {
    return { data: [], total: 0, hasMore: false };
  }

  const clubIds = clubCitiesData.map((row: any) => row.club_id);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Get clubs by IDs with pagination, excluding archived
  const { data, error, count } = await db
    .from(table)
    .select(CLUB_COLUMNS, { count: "exact" })
    .in("id", clubIds)
    .is("archived_at", null) // Exclude archived clubs
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    log.error("Failed to list clubs by city", { cityId, error });
    throw new InternalError("Failed to list clubs by city", error);
  }

  return {
    data: (data ?? []) as DbClub[],
    total: count ?? 0,
    hasMore: (count ?? 0) > to + 1,
  };
}

/**
 * Get multiple clubs by IDs (batch query to avoid N+1)
 */
export async function getClubsByIds(ids: string[]): Promise<DbClub[]> {
  if (ids.length === 0) return [];
  
  const db = getAdminDb();
  
  const { data, error } = await db
    .from(table)
    .select(CLUB_COLUMNS)
    .in("id", ids);
  
  if (error) {
    log.error("Failed to get clubs by IDs", { ids, error });
    throw new InternalError("Failed to get clubs by IDs", error);
  }
  
  return (data ?? []) as DbClub[];
}

