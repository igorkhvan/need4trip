/**
 * City Repository
 * 
 * Репозиторий для работы со справочником городов
 * Popular cities are cached for better performance
 */

import { supabase, ensureClient } from "@/lib/db/client";
import { InternalError } from "@/lib/errors";
import { City } from "@/lib/types/city";
import { log } from "@/lib/utils/logger";
import { StaticCache } from "@/lib/cache/staticCache";

const table = "cities";

// ============================================================================
// Cache Configuration
// ============================================================================

const popularCitiesCache = new StaticCache<City>(
  {
    ttl: 60 * 60 * 1000, // 1 hour - popular cities list may change
    name: 'popular_cities',
  },
  async () => {
    // Loader function
    ensureClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("is_popular", true)
      .order("population", { ascending: false, nullsFirst: false })
      .order("name", { ascending: true })
      .limit(30); // Load top 30 popular cities

    if (error) {
      log.error("Failed to load popular cities for cache", { error });
      throw new InternalError("Failed to load popular cities", error);
    }

    return (data || []).map(mapRowToCity);
  },
  (city) => city.id // Key extractor
);


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
  ensureClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    log.error("Failed to fetch city by id", { cityId: id, error });
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
  ensureClient();
  if (!supabase) return [];

  // Поиск по началу названия (case-insensitive)
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .ilike("name", `${query}%`)
    .order("is_popular", { ascending: false })
    .order("population", { ascending: false, nullsFirst: false })
    .order("name", { ascending: true })
    .limit(limit);

  if (error) {
    log.error("Failed to search cities", { query, error });
    throw new InternalError("Failed to search cities", error);
  }

  return (data || []).map(mapRowToCity);
}

/**
 * Get all popular cities (cached)
 * Perfect for dropdowns and filters
 */
export async function getPopularCities(limit: number = 25): Promise<City[]> {
  const all = await popularCitiesCache.getAll();
  return all.slice(0, limit); // Return requested limit from cache
}

/**
 * Invalidate popular cities cache
 */
export async function invalidatePopularCitiesCache(): Promise<void> {
  popularCitiesCache.clear();
  log.info("Popular cities cache invalidated");
}

/**
 * Get all cities (for admin/management)
 */
export async function getAllCities(): Promise<City[]> {
  ensureClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("is_popular", { ascending: false })
    .order("population", { ascending: false, nullsFirst: false })
    .order("name", { ascending: true });

  if (error) {
    log.error("Failed to fetch all cities", { error });
    throw new InternalError("Failed to fetch all cities", error);
  }

  return (data || []).map(mapRowToCity);
}

/**
 * Find city by exact name (case-insensitive)
 */
export async function findCityByName(name: string): Promise<City | null> {
  ensureClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .ilike("name", name)
    .maybeSingle();

  if (error) {
    log.error("Failed to find city by name", { name, error });
    throw new InternalError("Failed to find city by name", error);
  }

  if (!data) return null;
  return mapRowToCity(data);
}

/**
 * Get cities by IDs (for batch hydration)
 * Returns a Map<cityId, City> for efficient lookup
 */
export async function getCitiesByIds(cityIds: string[]): Promise<Map<string, City>> {
  if (cityIds.length === 0) {
    return new Map();
  }

  ensureClient();
  if (!supabase) return new Map();

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .in("id", cityIds);

  if (error) {
    log.error("Failed to get cities by IDs", { count: cityIds.length, error });
    throw new InternalError("Failed to get cities by IDs", error);
  }

  const cityMap = new Map<string, City>();
  (data ?? []).forEach((row: any) => {
    const city = mapRowToCity(row);
    cityMap.set(city.id, city);
  });

  return cityMap;
}
