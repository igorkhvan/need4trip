import { Event } from "@/lib/types/event";
import { EventCategoryDto } from "@/lib/types/eventCategory";
import { getEventCategoriesByIds } from "@/lib/db/eventCategoryRepo";

/**
 * Hydrate events with category data
 * Efficiently loads all categories in one batch query
 */
export async function hydrateEventCategories<T extends { categoryId: string | null }>(
  events: T[]
): Promise<(T & { category?: EventCategoryDto | null })[]> {
  // Collect all unique category IDs
  const categoryIds = events
    .map((e) => e.categoryId)
    .filter((id): id is string => id !== null);
  
  const uniqueCategoryIds = Array.from(new Set(categoryIds));

  // Batch load categories
  let categoriesMap = new Map<string, EventCategoryDto>();
  if (uniqueCategoryIds.length > 0) {
    try {
      const categoriesFullMap = await getEventCategoriesByIds(uniqueCategoryIds);
      // Convert to DTO format
      categoriesFullMap.forEach((cat, id) => {
        categoriesMap.set(id, {
          id: cat.id,
          code: cat.code,
          nameRu: cat.nameRu,
          nameEn: cat.nameEn,
          icon: cat.icon,
        });
      });
    } catch (err) {
      console.error("[hydrateEventCategories] Failed to load categories", err);
    }
  }

  // Attach categories to events
  return events.map((event) => ({
    ...event,
    category: event.categoryId ? categoriesMap.get(event.categoryId) || null : null,
  }));
}

