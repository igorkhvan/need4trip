import { supabase } from "./client";
import { EventCategory } from "@/lib/types/eventCategory";
import { log } from "@/lib/utils/logger";

/**
 * Get all active event categories
 */
export async function getActiveEventCategories(): Promise<EventCategory[]> {
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
    log.error("Failed to fetch event categories", { error });
    throw new Error("Failed to fetch event categories");
  }

  return (data || []).map(mapDbToEventCategory);
}

/**
 * Get event category by ID
 */
export async function getEventCategoryById(id: string): Promise<EventCategory | null> {
  if (!supabase) {
    log.warn("Supabase client not initialized");
    return null;
  }

  const { data, error } = await supabase
    .from("event_categories")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // not found
    log.error("Failed to fetch event category by ID", { categoryId: id, error });
    throw new Error("Failed to fetch event category");
  }

  return mapDbToEventCategory(data);
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
 * Get multiple event categories by IDs
 */
export async function getEventCategoriesByIds(ids: string[]): Promise<Map<string, EventCategory>> {
  if (ids.length === 0) return new Map();
  
  if (!supabase) {
    log.warn("Supabase client not initialized");
    return new Map();
  }

  const { data, error } = await supabase
    .from("event_categories")
    .select("*")
    .in("id", ids);

  if (error) {
    log.error("Failed to fetch event categories by IDs", { count: ids.length, error });
    throw new Error("Failed to fetch event categories");
  }

  const map = new Map<string, EventCategory>();
  (data || []).forEach((row: any) => {
    map.set(row.id, mapDbToEventCategory(row));
  });

  return map;
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

