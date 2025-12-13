/**
 * Currency Repository - Database operations for currencies table
 */

import { supabase } from "@/lib/db/client";
import { InternalError } from "@/lib/errors";
import { Currency } from "@/lib/types/currency";

// ============================================================================
// Database Row Type
// ============================================================================

interface DbCurrency {
  code: string;
  symbol: string;
  name_ru: string;
  name_en: string;
  decimal_places: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

// ============================================================================
// Mapper Function
// ============================================================================

function mapDbCurrencyToDomain(row: DbCurrency): Currency {
  return {
    code: row.code,
    symbol: row.symbol,
    nameRu: row.name_ru,
    nameEn: row.name_en,
    decimalPlaces: row.decimal_places,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

// ============================================================================
// Repository Functions
// ============================================================================

function ensureClient() {
  if (!supabase) {
    throw new InternalError("Supabase client is not configured");
  }
  return supabase;
}

/**
 * Get all active currencies
 */
export async function getActiveCurrencies(): Promise<Currency[]> {
  if (!supabase) {
    console.warn("[currencyRepo] Supabase client is not configured");
    return [];
  }
  
  const { data, error } = await supabase
    .from("currencies")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("code", { ascending: true });

  if (error) {
    console.error("[currencyRepo] Error fetching currencies:", error);
    return [];
  }

  return (data || []).map((row: DbCurrency) => mapDbCurrencyToDomain(row));
}

/**
 * Get all currencies (including inactive)
 */
export async function getAllCurrencies(): Promise<Currency[]> {
  if (!supabase) {
    console.warn("[currencyRepo] Supabase client is not configured");
    return [];
  }
  
  const { data, error } = await supabase
    .from("currencies")
    .select("*")
    .order("is_active", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("code", { ascending: true });

  if (error) {
    console.error("[currencyRepo] Error fetching all currencies:", error);
    return [];
  }

  return (data || []).map((row: DbCurrency) => mapDbCurrencyToDomain(row));
}

/**
 * Get currency by code
 */
export async function getCurrencyByCode(code: string): Promise<Currency | null> {
  if (!supabase) {
    console.warn("[currencyRepo] Supabase client is not configured");
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
    console.error("[currencyRepo] Error fetching currency:", error);
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
    console.warn("[currencyRepo] Supabase client is not configured");
    return new Map();
  }
  
  const upperCodes = codes.map(c => c.toUpperCase());
  const { data, error } = await supabase
    .from("currencies")
    .select("*")
    .in("code", upperCodes);

  if (error) {
    console.error("[currencyRepo] Error fetching currencies by codes:", error);
    return new Map();
  }

  const currencyMap = new Map<string, Currency>();
  (data || []).forEach((row: DbCurrency) => {
    currencyMap.set(row.code, mapDbCurrencyToDomain(row));
  });

  return currencyMap;
}
