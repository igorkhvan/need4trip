/**
 * Currency Repository - Database operations for currencies table
 * Uses StaticCache for optimal performance (currencies rarely change)
 */

import { supabase, ensureClient } from "@/lib/db/client";
import { InternalError } from "@/lib/errors";
import { Currency } from "@/lib/types/currency";
import { log } from "@/lib/utils/logger";
import { StaticCache } from "@/lib/cache/staticCache";

// ============================================================================
// Database Row Type
// ============================================================================

interface DbCurrency {
  code: string;
  symbol: string;
  name_ru: string;
  name_en: string | null;
  decimal_places: number | null;
  is_active: boolean | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Mapper Function
// ============================================================================

function mapDbCurrencyToDomain(row: any): Currency {
  return {
    code: row.code,
    symbol: row.symbol,
    nameRu: row.name_ru,
    nameEn: row.name_en || row.name_ru,  // fallback to nameRu if null
    decimalPlaces: row.decimal_places ?? 0,
    isActive: row.is_active ?? true,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
  };
}

// ============================================================================
// Cache Configuration
// ============================================================================

const currenciesCache = new StaticCache<Currency>(
  {
    ttl: 24 * 60 * 60 * 1000, // 24 hours - currencies rarely change
    name: 'currencies',
  },
  async () => {
    // Loader function - loads all active currencies
    if (!supabase) {
      log.warn("Supabase client is not configured");
      return [];
    }
    
    const { data, error } = await supabase
      .from("currencies")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("code", { ascending: true });

    if (error) {
      log.error("Error loading currencies for cache", { error });
      return [];
    }

    return (data || []).map((row: any) => mapDbCurrencyToDomain(row));
  },
  (currency) => currency.code // Key extractor
);

// ============================================================================
// Repository Functions
// ============================================================================

/**
 * Get all active currencies (cached)
 * First call: loads from DB
 * Subsequent calls: returns from cache (0ms)
 */
export async function getActiveCurrencies(): Promise<Currency[]> {
  return currenciesCache.getAll();
}

/**
 * Get all currencies (including inactive)
 * Note: This bypasses cache for admin operations
 */
export async function getAllCurrencies(): Promise<Currency[]> {
  if (!supabase) {
    log.warn("Supabase client is not configured");
    return [];
  }
  
  // Admin function - always fetch fresh data
  const { data, error } = await supabase
    .from("currencies")
    .select("*")
    .order("is_active", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("code", { ascending: true });

  if (error) {
    log.error("Error fetching all currencies", { error });
    return [];
  }

  return (data || []).map((row: any) => mapDbCurrencyToDomain(row));
}

/**
 * Get currency by code (cached, O(1))
 */
export async function getCurrencyByCode(code: string): Promise<Currency | null> {
  return currenciesCache.getByKey(code.toUpperCase());
}

/**
 * Get currencies by codes (cached, O(1) per code)
 * Perfect for batch hydration - no DB queries!
 */
export async function getCurrenciesByCodes(codes: string[]): Promise<Map<string, Currency>> {
  if (codes.length === 0) {
    return new Map();
  }

  const upperCodes = codes.map(c => c.toUpperCase());
  return currenciesCache.getByKeys(upperCodes);
}

/**
 * Invalidate cache (for admin operations)
 * Call this after adding/updating currencies
 */
export async function invalidateCurrenciesCache(): Promise<void> {
  currenciesCache.clear();
  log.info("Currencies cache invalidated");
}
