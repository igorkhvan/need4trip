import { supabase } from "./client";
import { EventCategory } from "@/lib/types/eventCategory";
import { log } from "@/lib/utils/logger";
import { StaticCache } from "@/lib/cache/staticCache";

// ============================================================================
// Cache Configuration
// ============================================================================

const categoriesCache = new StaticCache<EventCategory>(
  {
    ttl: 60 * 60 * 1000, // 1 hour - categories may change occasionally
    name: 'event_categories',
  },
  async () => {
    // Loader function
    if (!supabase) {
      log.warn("Supabase client not initialized");
      return [];
    }

    const { data, error } = await supabase
      .from("event_categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      log.error("Failed to load event categories for cache", { error });
      throw new Error("Failed to load event categories");
    }

    return (data || []).map(mapDbToEventCategory);
  },
  (category) => category.id // Key extractor
);

// ============================================================================
// Public API
// ============================================================================

/**
 * Get all active event categories (cached)
 */
export async function getActiveEventCategories(): Promise<EventCategory[]> {
  return categoriesCache.getAll();
}

/**
 * Get event category by ID (cached, O(1))
 */
export async function getEventCategoryById(id: string): Promise<EventCategory | null> {
  return categoriesCache.getByKey(id);
}

/**
 * Get event category by code
 */
export async function getEventCategoryByCode(code: string): Promise<EventCategory | null> {
  if (!supabase) {
    log.warn("Supabase client not initialized");
    return null;
  }

  const { data, error } = await supabase
    .from("event_categories")
    .select("*")
    .eq("code", code)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // not found
    log.error("Failed to fetch event category by code", { code, error });
    throw new Error("Failed to fetch event category");
  }

  return mapDbToEventCategory(data);
}

/**
 * Get multiple event categories by IDs (cached, O(1) per ID)
 */
export async function getEventCategoriesByIds(ids: string[]): Promise<Map<string, EventCategory>> {
  if (ids.length === 0) return new Map();
  return categoriesCache.getByKeys(ids);
}

/**
 * Invalidate cache (for admin operations)
 */
export async function invalidateEventCategoriesCache(): Promise<void> {
  categoriesCache.clear();
  log.info("Event categories cache invalidated");
}

/**
 * Map database row to EventCategory domain model
 */
function mapDbToEventCategory(row: any): EventCategory {
  return {
    id: row.id,
    code: row.code,
    nameRu: row.name_ru,
    nameEn: row.name_en,
    icon: row.icon,
    displayOrder: row.display_order,
    isActive: row.is_active,
    isDefault: row.is_default ?? false, // Added
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

