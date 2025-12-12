/**
 * Currency Types
 * 
 * Типы для нормализованного справочника валют
 */

import { z } from "zod";

// ============================================================================
// Currency Interface
// ============================================================================

export interface Currency {
  code: string;         // ISO 4217: RUB, USD, EUR
  symbol: string;       // ₽, $, €
  nameRu: string;       // Российский рубль
  nameEn: string;       // Russian Ruble
  decimalPlaces: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

// Hydrated currency info (used in Event interface)
export interface CurrencyHydrated {
  code: string;
  symbol: string;
  nameRu: string;
}

// ============================================================================
// Zod Schema
// ============================================================================

export const currencyCodeSchema = z.string().length(3).toUpperCase();
export type CurrencyCode = z.infer<typeof currencyCodeSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format price with currency symbol
 */
export function formatPrice(price: number, currency: Currency | CurrencyCode | string): string {
  if (typeof currency === "string") {
    // Fallback for currency code
    const symbols: Record<string, string> = {
      RUB: "₽",
      KZT: "₸",
      USD: "$",
      EUR: "€",
    };
    return `${price} ${symbols[currency] ?? currency}`;
  }
  
  // Full currency object
  const curr = currency as Currency;
  return `${price.toFixed(curr.decimalPlaces)} ${curr.symbol}`;
}

/**
 * Get currency symbol by code
 */
export function getCurrencySymbol(code: CurrencyCode): string {
  const symbols: Record<string, string> = {
    RUB: "₽",
    KZT: "₸",
    USD: "$",
    EUR: "€",
    UAH: "₴",
    BYN: "Br",
    GEL: "₾",
  };
  return symbols[code] ?? code;
}
