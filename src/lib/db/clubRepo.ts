import { supabase, ensureClient } from "@/lib/db/client";
import { InternalError, NotFoundError } from "@/lib/errors";
import type { ClubCreateInput, ClubUpdateInput } from "@/lib/types/club";
import { log } from "@/lib/utils/logger";

const table = "clubs";

// ============================================================================
// Database Types (snake_case)
// ============================================================================

export interface DbClub {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  telegram_url: string | null;
  website_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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
 */
export async function listClubs(page = 1, limit = 12): Promise<{
  data: DbClub[];
  total: number;
  hasMore: boolean;
}> {
  ensureClient();
  if (!supabase) return { data: [], total: 0, hasMore: false };

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from(table)
    .select("*", { count: "exact" })
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
 */
export async function listClubsWithOwner(): Promise<DbClubWithOwner[]> {
  ensureClient();
  if (!supabase) return [];

  const { data, error} = await supabase
    .from(table)
    .select("*, created_by_user:users!created_by(id, name, telegram_handle)")
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
  ensureClient();
  if (!supabase) return null;

  if (!id || !/^[0-9a-fA-F-]{36}$/.test(id)) {
    log.warn("Invalid club id provided", { id });
    return null;
  }

  const { data, error } = await supabase
    .from(table)
    .select("*")
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
  ensureClient();
  if (!supabase) return null;

  if (!id || !/^[0-9a-fA-F-]{36}$/.test(id)) {
    log.warn("Invalid club id provided", { id });
    return null;
  }

  const { data, error } = await supabase
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
 * Create new club
 */
export async function createClub(payload: ClubCreateInput): Promise<DbClub> {
  ensureClient();
  if (!supabase) {
    throw new InternalError("Supabase client is not configured");
  }

  const now = new Date().toISOString();

  const insertPayload = {
    name: payload.name,
    description: payload.description ?? null,
    logo_url: payload.logoUrl ?? null,
    telegram_url: payload.telegramUrl ?? null,
    website_url: payload.websiteUrl ?? null,
    created_by: payload.createdBy ?? null,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from(table)
    .insert(insertPayload)
    .select("*")
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
 * Update club
 */
export async function updateClub(
  id: string,
  payload: ClubUpdateInput
): Promise<DbClub | null> {
  ensureClient();
  if (!supabase) {
    throw new InternalError("Supabase client is not configured");
  }

  const patch = {
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.description !== undefined ? { description: payload.description } : {}),
    ...(payload.logoUrl !== undefined ? { logo_url: payload.logoUrl } : {}),
    ...(payload.telegramUrl !== undefined ? { telegram_url: payload.telegramUrl } : {}),
    ...(payload.websiteUrl !== undefined ? { website_url: payload.websiteUrl } : {}),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(table)
    .update(patch)
    .eq("id", id)
    .select("*")
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
 * Delete club
 */
export async function deleteClub(id: string): Promise<boolean> {
  ensureClient();
  if (!supabase) {
    throw new InternalError("Supabase client is not configured");
  }

  const { error, count } = await supabase
    .from(table)
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    log.error("Failed to delete club", { clubId: id, error });
    throw new InternalError("Failed to delete club", error);
  }

  if ((count ?? 0) === 0) {
    throw new NotFoundError("Club not found");
  }

  return true;
}

/**
 * List clubs created by user
 */
export async function listClubsByCreator(userId: string): Promise<DbClub[]> {
  ensureClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from(table)
    .select("*")
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
 */
export async function searchClubs(query: string, page = 1, limit = 12): Promise<{
  data: DbClub[];
  total: number;
  hasMore: boolean;
}> {
  ensureClient();
  if (!supabase) return { data: [], total: 0, hasMore: false };

  const searchPattern = `%${query}%`;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from(table)
    .select("*", { count: "exact" })
    .ilike("name", searchPattern)
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
  ensureClient();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
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
  ensureClient();
  if (!supabase) return [];

  const { data, error } = await supabase
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
  ensureClient();
  if (!supabase || clubIds.length === 0) return new Map();

  const { data, error } = await supabase
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
  ensureClient();
  if (!supabase) {
    throw new InternalError("Supabase client is not configured");
  }

  // Delete existing associations
  const { error: deleteError } = await supabase
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

    const { error: insertError } = await supabase
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
 */
export async function listClubsByCity(cityId: string, page = 1, limit = 12): Promise<{
  data: DbClub[];
  total: number;
  hasMore: boolean;
}> {
  ensureClient();
  if (!supabase) return { data: [], total: 0, hasMore: false };

  // Get club IDs that have this city
  const { data: clubCitiesData, error: clubCitiesError } = await supabase
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

  // Get clubs by IDs with pagination
  const { data, error, count } = await supabase
    .from(table)
    .select("*", { count: "exact" })
    .in("id", clubIds)
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


