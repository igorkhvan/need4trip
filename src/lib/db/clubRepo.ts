import { supabase } from "@/lib/db/client";
import { InternalError, NotFoundError } from "@/lib/errors";
import type { ClubCreateInput, ClubUpdateInput } from "@/lib/types/club";

const table = "clubs";

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

export interface DbClub {
  id: string;
  name: string;
  description: string | null;
  city: string | null;
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
 * List all clubs
 */
export async function listClubs(): Promise<DbClub[]> {
  const client = ensureClient();
  if (!client) return [];

  const { data, error } = await client
    .from(table)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to list clubs", error);
    throw new InternalError("Failed to list clubs", error);
  }

  return (data ?? []) as DbClub[];
}

/**
 * List clubs with owner info
 */
export async function listClubsWithOwner(): Promise<DbClubWithOwner[]> {
  const client = ensureClient();
  if (!client) return [];

  const { data, error } = await client
    .from(table)
    .select("*, created_by_user:users!created_by(id, name, telegram_handle)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to list clubs with owner", error);
    throw new InternalError("Failed to list clubs", error);
  }

  return (data ?? []) as DbClubWithOwner[];
}

/**
 * Get club by ID
 */
export async function getClubById(id: string): Promise<DbClub | null> {
  const client = ensureClient();
  if (!client) return null;

  if (!id || !/^[0-9a-fA-F-]{36}$/.test(id)) {
    console.warn("Invalid club id provided", id);
    return null;
  }

  const { data, error } = await client
    .from(table)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(`Failed to get club ${id}`, error);
    throw new InternalError("Failed to get club", error);
  }

  return data ? (data as DbClub) : null;
}

/**
 * Get club with owner info
 */
export async function getClubWithOwner(id: string): Promise<DbClubWithOwner | null> {
  const client = ensureClient();
  if (!client) return null;

  if (!id || !/^[0-9a-fA-F-]{36}$/.test(id)) {
    console.warn("Invalid club id provided", id);
    return null;
  }

  const { data, error } = await client
    .from(table)
    .select("*, created_by_user:users!created_by(id, name, telegram_handle)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(`Failed to get club with owner ${id}`, error);
    throw new InternalError("Failed to get club", error);
  }

  return data ? (data as DbClubWithOwner) : null;
}

/**
 * Create new club
 */
export async function createClub(payload: ClubCreateInput): Promise<DbClub> {
  const client = ensureClient();
  if (!client) {
    throw new InternalError("Supabase client is not configured");
  }

  const now = new Date().toISOString();

  const insertPayload = {
    name: payload.name,
    description: payload.description ?? null,
    city: payload.city ?? null,
    logo_url: payload.logoUrl ?? null,
    telegram_url: payload.telegramUrl ?? null,
    website_url: payload.websiteUrl ?? null,
    created_by: payload.createdBy ?? null,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await client
    .from(table)
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to create club", error);
    throw new InternalError("Failed to create club", error);
  }

  return data as DbClub;
}

/**
 * Update club
 */
export async function updateClub(
  id: string,
  payload: ClubUpdateInput
): Promise<DbClub | null> {
  const client = ensureClient();
  if (!client) {
    throw new InternalError("Supabase client is not configured");
  }

  const patch = {
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.description !== undefined ? { description: payload.description } : {}),
    ...(payload.city !== undefined ? { city: payload.city } : {}),
    ...(payload.logoUrl !== undefined ? { logo_url: payload.logoUrl } : {}),
    ...(payload.telegramUrl !== undefined ? { telegram_url: payload.telegramUrl } : {}),
    ...(payload.websiteUrl !== undefined ? { website_url: payload.websiteUrl } : {}),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from(table)
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error(`Failed to update club ${id}`, error);
    throw new InternalError("Failed to update club", error);
  }

  return data ? (data as DbClub) : null;
}

/**
 * Delete club
 */
export async function deleteClub(id: string): Promise<boolean> {
  const client = ensureClient();
  if (!client) {
    throw new InternalError("Supabase client is not configured");
  }

  const { error, count } = await client
    .from(table)
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    console.error(`Failed to delete club ${id}`, error);
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
  const client = ensureClient();
  if (!client) return [];

  const { data, error } = await client
    .from(table)
    .select("*")
    .eq("created_by", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to list clubs by creator", error);
    throw new InternalError("Failed to list clubs", error);
  }

  return (data ?? []) as DbClub[];
}

/**
 * Search clubs by name or city
 */
export async function searchClubs(query: string): Promise<DbClub[]> {
  const client = ensureClient();
  if (!client) return [];

  const searchPattern = `%${query}%`;

  const { data, error } = await client
    .from(table)
    .select("*")
    .or(`name.ilike.${searchPattern},city.ilike.${searchPattern}`)
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to search clubs", error);
    throw new InternalError("Failed to search clubs", error);
  }

  return (data ?? []) as DbClub[];
}

