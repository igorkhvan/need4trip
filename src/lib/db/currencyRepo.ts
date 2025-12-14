/**
 * Currency Repository - Database operations for currencies table
 */

import { supabase, ensureClient } from "@/lib/db/client";
import { InternalError } from "@/lib/errors";
import { Currency } from "@/lib/types/currency";
import { log } from "@/lib/utils/logger";

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
// Repository Functions
// ============================================================================


/**
 * Get all active currencies
 */
export async function getActiveCurrencies(): Promise<Currency[]> {
  log.debug("getActiveCurrencies called");
  
  if (!supabase) {
    log.warn("Supabase client is not configured");
    return [];
  }
  
  log.debug("Fetching currencies from DB");
  
  // Order by sort_order, then by code
  const { data, error } = await supabase
    .from("currencies")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("code", { ascending: true });

  if (error) {
    log.error("Error fetching currencies", { 
      error: {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      }
    });
    return [];
  }

  log.debug("Fetched currencies from DB", { count: data?.length || 0 });

  return (data || []).map((row: any) => mapDbCurrencyToDomain(row));
}

/**
 * Get all currencies (including inactive)
 */
export async function getAllCurrencies(): Promise<Currency[]> {
  if (!supabase) {
    log.warn("Supabase client is not configured");
    return [];
  }
  
  // Получаем ВСЕ валюты (активные и неактивные)
  const { data, error } = await supabase
    .from("currencies")
    .select("*")
    .order("is_active", { ascending: false }) // Активные первыми
    .order("sort_order", { ascending: true })
    .order("code", { ascending: true });

  if (error) {
    log.error("Error fetching all currencies", { error });
    return [];
  }

  return (data || []).map((row: any) => mapDbCurrencyToDomain(row));
}

/**
 * Get currency by code
 */
export async function getCurrencyByCode(code: string): Promise<Currency | null> {
  if (!supabase) {
    log.warn("Supabase client is not configured");
    return null;
  }
  
  const { data, error } = await supabase
    .from("currencies")
    .select("*")
    .eq("code", code.toUpperCase())
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    log.error("Error fetching currency", { code, error });
    return null;
  }

  return data ? mapDbCurrencyToDomain(data as DbCurrency) : null;
}

/**
 * Get currencies by codes (for hydration)
 */
export async function getCurrenciesByCodes(codes: string[]): Promise<Map<string, Currency>> {
  if (codes.length === 0) {
    return new Map();
  }

  if (!supabase) {
    log.warn("Supabase client is not configured");
    return new Map();
  }
  
  const upperCodes = codes.map(c => c.toUpperCase());
  const { data, error } = await supabase
    .from("currencies")
    .select("*")
    .in("code", upperCodes);

  if (error) {
    log.error("Error fetching currencies by codes", { codes: upperCodes, error });
    return new Map();
  }

  const currencyMap = new Map<string, Currency>();
  (data || []).forEach((row: DbCurrency) => {
    currencyMap.set(row.code, mapDbCurrencyToDomain(row));
  });

  return currencyMap;
}
