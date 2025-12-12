/**
 * City Repository
 * 
 * Репозиторий для работы со справочником городов
 */

import { supabase } from "@/lib/db/client";
import { InternalError } from "@/lib/errors";
import { City } from "@/lib/types/city";

const table = "cities";

function ensureClient() {
  if (!supabase) {
    console.warn("Supabase client is not configured");
    return null;
  }
  return supabase;
}

function mapRowToCity(data: any): City {
  return {
    id: data.id,
    name: data.name,
    nameEn: data.name_en ?? null,
    region: data.region ?? null,
    country: data.country ?? "RU",
    lat: data.lat ?? null,
    lng: data.lng ?? null,
    population: data.population ?? null,
    isPopular: data.is_popular ?? false,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Get city by ID
 */
export async function getCityById(id: string): Promise<City | null> {
  const client = ensureClient();
  if (!client) return null;

  const { data, error } = await (client as any)
    .from(table)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch city by id", error);
    throw new InternalError("Failed to fetch city by id", error);
  }

  if (!data) return null;
  return mapRowToCity(data);
}

/**
 * Search cities by name (autocomplete)
 * Возвращает до 20 городов, популярные первыми
 */
export async function searchCities(query: string, limit: number = 20): Promise<City[]> {
  const client = ensureClient();
  if (!client) return [];

  // Поиск по началу названия (case-insensitive)
  const { data, error } = await (client as any)
    .from(table)
    .select("*")
    .ilike("name", `${query}%`)
    .order("is_popular", { ascending: false })
    .order("population", { ascending: false, nullsFirst: false })
    .order("name", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Failed to search cities", error);
    throw new InternalError("Failed to search cities", error);
  }

  return (data || []).map(mapRowToCity);
}

/**
 * Get all popular cities (for UI filters and quick select)
 */
export async function getPopularCities(limit: number = 25): Promise<City[]> {
  const client = ensureClient();
  if (!client) return [];

  const { data, error } = await (client as any)
    .from(table)
    .select("*")
    .eq("is_popular", true)
    .order("population", { ascending: false, nullsFirst: false })
    .order("name", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch popular cities", error);
    throw new InternalError("Failed to fetch popular cities", error);
  }

  return (data || []).map(mapRowToCity);
}

/**
 * Get all cities (for admin/management)
 */
export async function getAllCities(): Promise<City[]> {
  const client = ensureClient();
  if (!client) return [];

  const { data, error } = await (client as any)
    .from(table)
    .select("*")
    .order("is_popular", { ascending: false })
    .order("population", { ascending: false, nullsFirst: false })
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to fetch all cities", error);
    throw new InternalError("Failed to fetch all cities", error);
  }

  return (data || []).map(mapRowToCity);
}

/**
 * Find city by exact name (case-insensitive)
 */
export async function findCityByName(name: string): Promise<City | null> {
  const client = ensureClient();
  if (!client) return null;

  const { data, error } = await (client as any)
    .from(table)
    .select("*")
    .ilike("name", name)
    .maybeSingle();

  if (error) {
    console.error("Failed to find city by name", error);
    throw new InternalError("Failed to find city by name", error);
  }

  if (!data) return null;
  return mapRowToCity(data);
}
