/**
 * City Types
 * 
 * Типы для нормализованного справочника городов
 */

import { z } from "zod";

// ============================================================================
// City Interface
// ============================================================================

export interface City {
  id: string;
  name: string;
  nameEn: string | null;
  region: string | null;
  country: string;
  lat: number | null;
  lng: number | null;
  population: number | null;
  isPopular: boolean;
  createdAt: string;
  updatedAt: string;
}

// Minimal city info (for display in UI)
export interface CityBasic {
  id: string;
  name: string;
  region?: string | null;
}

// Hydrated city info (used in Event, Club, User interfaces)
export interface CityHydrated {
  id: string;
  name: string;
  region: string | null;
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const citySchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  nameEn: z.string().trim().max(100).nullable().optional(),
  region: z.string().trim().max(200).nullable().optional(),
  country: z.string().length(2).default("RU"),
  lat: z.number().finite().nullable().optional(),
  lng: z.number().finite().nullable().optional(),
  population: z.number().int().positive().nullable().optional(),
  isPopular: z.boolean().default(false),
});

export type CityInput = z.infer<typeof citySchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format city name with region (for display)
 */
export function formatCityName(city: CityBasic): string {
  if (city.region) {
    return `${city.name}, ${city.region}`;
  }
  return city.name;
}

/**
 * Get city display label (with region if exists)
 */
export function getCityLabel(city: City | CityBasic | null): string {
  if (!city) return "Не указан";
  return formatCityName(city);
}

/**
 * Get country flag emoji by country code
 */
export function getCountryFlag(countryCode: string): string {
  const flags: Record<string, string> = {
    RU: "🇷🇺",
    KZ: "🇰🇿",
    BY: "🇧🇾",
    UA: "🇺🇦",
    GE: "🇬🇪",
    AM: "🇦🇲",
    AZ: "🇦🇿",
    UZ: "🇺🇿",
    KG: "🇰🇬",
    TJ: "🇹🇯",
    TM: "🇹🇲",
    MD: "🇲🇩",
  };
  return flags[countryCode] ?? "🌍";
}
