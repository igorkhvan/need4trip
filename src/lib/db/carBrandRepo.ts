import { supabase, ensureClient } from "@/lib/db/client";
import { InternalError } from "@/lib/errors";
import { CarBrand } from "@/lib/types/event";
import { log } from "@/lib/utils/logger";
import { StaticCache } from "@/lib/cache/staticCache";

const table = "car_brands";

// ============================================================================
// Cache Configuration
// ============================================================================

const brandsCache = new StaticCache<CarBrand>(
  {
    ttl: 24 * 60 * 60 * 1000, // 24 hours - car brands almost never change
    name: 'car_brands',
  },
  async () => {
    // Loader function - only called when cache is empty or expired
    ensureClient();
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from(table)
      .select("id, name, slug")
      .order("name", { ascending: true });

    if (error) {
      log.error("Failed to load car brands for cache", { error });
      throw new InternalError("Failed to load car brands", error);
    }

    return (data ?? []) as CarBrand[];
  },
  (brand) => brand.id // Key extractor for O(1) lookups
);

// ============================================================================
// Public API
// ============================================================================

/**
 * Get all car brands (cached)
 * First call: loads from DB
 * Subsequent calls: returns from cache (0ms)
 */
export async function listCarBrands(): Promise<CarBrand[]> {
  return brandsCache.getAll();
}

/**
 * Get car brands by IDs (cached, O(1) per ID)
 * No DB queries - uses cached Map
 */
export async function getCarBrandsByIds(ids: string[]): Promise<CarBrand[]> {
  if (ids.length === 0) return [];
  
  const map = await brandsCache.getByKeys(ids);
  return Array.from(map.values());
}

/**
 * Get car brand by ID (cached, O(1))
 */
export async function getCarBrandById(id: string): Promise<CarBrand | null> {
  return brandsCache.getByKey(id);
}

/**
 * Invalidate cache (for admin operations)
 * Call this after adding/updating brands in admin panel
 */
export async function invalidateCarBrandsCache(): Promise<void> {
  brandsCache.clear();
  log.info("Car brands cache invalidated");
}
