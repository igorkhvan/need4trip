/**
 * Hydration Utilities
 * 
 * Утилиты для batch loading и hydration связанных данных
 */

import { getCitiesByIds } from "@/lib/db/cityRepo";
import { getCurrenciesByCodes } from "@/lib/db/currencyRepo";
import { getEventCategoriesByIds } from "@/lib/db/eventCategoryRepo";
import { getVehicleTypesByIds } from "@/lib/db/vehicleTypeRepo";
import { CityHydrated } from "@/lib/types/city";
import { CurrencyHydrated } from "@/lib/types/currency";
import { EventCategoryDto } from "@/lib/types/eventCategory";
import { VehicleType } from "@/lib/types/vehicleType";

// ============================================================================
// City Hydration
// ============================================================================

/**
 * Hydrate cities for items with cityId
 * 
 * @example
 * const events = await getEvents();
 * const hydratedEvents = await hydrateCities(events);
 * // Now events[0].city = { id, name, region }
 */
export async function hydrateCities<T extends { cityId: string | null }>(
  items: T[]
): Promise<(T & { city: CityHydrated | null })[]> {
  const cityIds = items
    .map(item => item.cityId)
    .filter((id): id is string => id !== null && id !== undefined);
  
  const uniqueCityIds = Array.from(new Set(cityIds));
  
  let citiesMap = new Map<string, any>();
  if (uniqueCityIds.length > 0) {
    try {
      citiesMap = await getCitiesByIds(uniqueCityIds);
    } catch (err) {
      console.error("[hydrateCities] Failed to load cities", err);
    }
  }
  
  return items.map(item => {
    const city = item.cityId ? citiesMap.get(item.cityId) : null;
    return {
      ...item,
      city: city ? { id: city.id, name: city.name, region: city.region } : null,
    };
  });
}

/**
 * Batch load cities by IDs and return as Map
 * Useful for manual hydration
 * 
 * @example
 * const cityIds = ['id1', 'id2', 'id3'];
 * const citiesMap = await hydrateCitiesByIds(cityIds);
 * const city = citiesMap.get('id1');
 */
export async function hydrateCitiesByIds(
  cityIds: string[]
): Promise<Map<string, CityHydrated>> {
  if (cityIds.length === 0) return new Map();
  
  const uniqueCityIds = Array.from(new Set(cityIds));
  
  try {
    const citiesMap = await getCitiesByIds(uniqueCityIds);
    const hydratedMap = new Map<string, CityHydrated>();
    
    citiesMap.forEach((city, id) => {
      hydratedMap.set(id, {
        id: city.id,
        name: city.name,
        region: city.region,
      });
    });
    
    return hydratedMap;
  } catch (err) {
    console.error("[hydrateCitiesByIds] Failed to load cities", err);
    return new Map();
  }
}

// ============================================================================
// Currency Hydration
// ============================================================================

/**
 * Hydrate currencies for items with currencyCode
 * 
 * @example
 * const events = await getEvents();
 * const hydratedEvents = await hydrateCurrencies(events);
 * // Now events[0].currency = { code, symbol, nameRu }
 */
export async function hydrateCurrencies<T extends { currencyCode?: string | null }>(
  items: T[]
): Promise<(T & { currency: CurrencyHydrated | null })[]> {
  const codes = items
    .map(item => item.currencyCode)
    .filter((code): code is string => code !== null && code !== undefined);
  
  const uniqueCodes = Array.from(new Set(codes));
  
  let currenciesMap = new Map<string, any>();
  if (uniqueCodes.length > 0) {
    try {
      currenciesMap = await getCurrenciesByCodes(uniqueCodes);
    } catch (err) {
      console.error("[hydrateCurrencies] Failed to load currencies", err);
    }
  }
  
  return items.map(item => {
    const currency = item.currencyCode ? currenciesMap.get(item.currencyCode) : null;
    return {
      ...item,
      currency: currency ? { code: currency.code, symbol: currency.symbol, nameRu: currency.nameRu } : null,
    };
  });
}

// ============================================================================
// Combined Hydration
// ============================================================================

/**
 * Hydrate both cities and currencies for items
 * Useful for events that have both cityId and currencyCode
 */
export async function hydrateCitiesAndCurrencies<
  T extends { cityId: string | null; currencyCode?: string | null }
>(
  items: T[]
): Promise<(T & { city: CityHydrated | null; currency: CurrencyHydrated | null })[]> {
  // Load both in parallel
  const [citiesMap, currenciesMap] = await Promise.all([
    (async () => {
      const cityIds = items
        .map(item => item.cityId)
        .filter((id): id is string => id !== null && id !== undefined);
      const uniqueCityIds = Array.from(new Set(cityIds));
      
      if (uniqueCityIds.length === 0) return new Map<string, any>();
      
      try {
        return await getCitiesByIds(uniqueCityIds);
      } catch (err) {
        console.error("[hydrateCitiesAndCurrencies] Failed to load cities", err);
        return new Map<string, any>();
      }
    })(),
    (async () => {
      const codes = items
        .map(item => item.currencyCode)
        .filter((code): code is string => code !== null && code !== undefined);
      const uniqueCodes = Array.from(new Set(codes));
      
      if (uniqueCodes.length === 0) return new Map<string, any>();
      
      try {
        return await getCurrenciesByCodes(uniqueCodes);
      } catch (err) {
        console.error("[hydrateCitiesAndCurrencies] Failed to load currencies", err);
        return new Map<string, any>();
      }
    })(),
  ]);
  
  return items.map(item => {
    const city = item.cityId ? citiesMap.get(item.cityId) : null;
    const currency = item.currencyCode ? currenciesMap.get(item.currencyCode) : null;
    
    return {
      ...item,
      city: city ? { id: city.id, name: city.name, region: city.region } : null,
      currency: currency ? { code: currency.code, symbol: currency.symbol, nameRu: currency.nameRu } : null,
    };
  });
}

// ============================================================================
// Event Category Hydration
// ============================================================================

/**
 * Hydrate event categories for items with categoryId
 * Efficiently loads all categories in one batch query
 * 
 * @example
 * const events = await getEvents();
 * const hydratedEvents = await hydrateEventCategories(events);
 * // Now events[0].category = { id, code, nameRu, ... }
 */
export async function hydrateEventCategories<T extends { categoryId: string | null }>(
  items: T[]
): Promise<(T & { category?: EventCategoryDto | null })[]> {
  // Collect all unique category IDs
  const categoryIds = items
    .map((item) => item.categoryId)
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
          isDefault: cat.isDefault,
        });
      });
    } catch (err) {
      console.error("[hydrateEventCategories] Failed to load categories", err);
    }
  }

  // Attach categories to items
  return items.map((item) => ({
    ...item,
    category: item.categoryId ? categoriesMap.get(item.categoryId) || null : null,
  }));
}

// ============================================================================
// Vehicle Type Hydration
// ============================================================================

/**
 * Hydrate vehicle types for items with vehicleTypeRequirement
 * Efficiently loads all vehicle types in one batch query
 * 
 * @example
 * const events = await getEvents();
 * const hydratedEvents = await hydrateVehicleTypes(events);
 * // Now events[0].vehicleType = { id, nameRu, ... }
 */
export async function hydrateVehicleTypes<T extends { vehicleTypeRequirement: string }>(
  items: T[]
): Promise<(T & { vehicleType?: VehicleType | null })[]> {
  // Collect all unique vehicle type IDs (excluding 'any')
  const vehicleTypeIds = items
    .map((item) => item.vehicleTypeRequirement)
    .filter((id): id is string => id !== null && id !== 'any');
  
  const uniqueVehicleTypeIds = Array.from(new Set(vehicleTypeIds));

  // Batch load vehicle types
  let vehicleTypesMap = new Map<string, VehicleType>();
  if (uniqueVehicleTypeIds.length > 0) {
    try {
      vehicleTypesMap = await getVehicleTypesByIds(uniqueVehicleTypeIds);
    } catch (err) {
      console.error("[hydrateVehicleTypes] Failed to load vehicle types", err);
    }
  }

  // Attach vehicle types to items
  return items.map((item) => ({
    ...item,
    vehicleType: item.vehicleTypeRequirement === 'any' 
      ? null 
      : vehicleTypesMap.get(item.vehicleTypeRequirement) || null,
  }));
}

