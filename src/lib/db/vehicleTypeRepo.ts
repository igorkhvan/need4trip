/**
 * Vehicle Type Repository
 * 
 * Manages vehicle types for user cars and event requirements.
 * All types are cached for optimal performance.
 */

import { supabase, ensureClient } from "@/lib/db/client";
import { InternalError } from "@/lib/errors";
import { VehicleType, DbVehicleType } from "@/lib/types/vehicleType";
import { log } from "@/lib/utils/logger";
import { StaticCache } from "@/lib/cache/staticCache";

const table = "vehicle_types";

// ============================================================================
// Mapping Functions
// ============================================================================

function mapDbToVehicleType(db: DbVehicleType): VehicleType {
  return {
    id: db.id,
    nameEn: db.name_en,
    nameRu: db.name_ru,
    displayOrder: db.display_order,
    isActive: db.is_active,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

// ============================================================================
// Cache Configuration
// ============================================================================

const vehicleTypesCache = new StaticCache<VehicleType>(
  {
    ttl: 24 * 60 * 60 * 1000, // 24 hours - vehicle types rarely change
    name: 'vehicle_types',
  },
  async () => {
    // Loader function
    ensureClient();
    if (!supabase) {
      log.warn("Supabase client not initialized");
      return [];
    }

    const { data, error } = await supabase
      .from(table as any) // Table not in generated types yet
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      log.error("Failed to load vehicle types for cache", { error });
      throw new InternalError("Failed to load vehicle types", error);
    }

    return ((data || []) as any[]).map(mapDbToVehicleType);
  },
  (type) => type.id // Key extractor
);

// ============================================================================
// Public API
// ============================================================================

/**
 * Get all active vehicle types (cached)
 * Returns types sorted by display_order
 */
export async function getActiveVehicleTypes(): Promise<VehicleType[]> {
  return vehicleTypesCache.getAll();
}

/**
 * Get vehicle type by ID (cached, O(1))
 */
export async function getVehicleTypeById(id: string): Promise<VehicleType | null> {
  return vehicleTypesCache.getByKey(id);
}

/**
 * Get vehicle types by IDs (cached, O(1) per ID)
 */
export async function getVehicleTypesByIds(ids: string[]): Promise<Map<string, VehicleType>> {
  if (ids.length === 0) return new Map();
  return vehicleTypesCache.getByKeys(ids);
}

/**
 * Invalidate cache (for admin operations)
 */
export async function invalidateVehicleTypesCache(): Promise<void> {
  vehicleTypesCache.clear();
  log.info("Vehicle types cache invalidated");
}

/**
 * Get vehicle types as select options
 * Convenience method for forms
 */
export async function getVehicleTypeOptions(): Promise<Array<{ value: string; label: string }>> {
  const types = await getActiveVehicleTypes();
  return types.map(type => ({
    value: type.id,
    label: type.nameRu, // Use Russian name for UI
  }));
}
