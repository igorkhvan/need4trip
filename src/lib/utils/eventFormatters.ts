/**
 * Event Formatters
 * 
 * Centralized UI formatting utilities for events.
 * Used by UI components to display consistent event information.
 * 
 * RULE: All event formatting MUST use these utilities (no inline formatting).
 */

import { Event } from "@/lib/types/event";

/**
 * Format event price for display
 * 
 * Rules:
 * - isPaid=false → "Бесплатно"
 * - isPaid=true, price=null → "Платное"
 * - isPaid=true, price=X → "X ₽" (with currency symbol)
 * 
 * @example
 * formatEventPrice(freeEvent)        // "Бесплатно"
 * formatEventPrice(paidNoPrice)      // "Платное"
 * formatEventPrice(paidWithPrice)    // "500 ₽"
 * formatEventPrice(paidUSD)          // "50 $"
 */
export function formatEventPrice(event: Event): string {
  if (!event.isPaid) {
    return "Бесплатно";
  }
  
  if (!event.price) {
    return "Платное";
  }
  
  const symbol = event.currency?.symbol ?? event.currencyCode ?? "";
  return `${event.price} ${symbol}`.trim();
}

/**
 * Format event price for inline text (with prefix)
 * 
 * @example
 * formatEventPriceInline(event)  // " Стоимость: 500 ₽."
 * formatEventPriceInline(event)  // " Стоимость: Платное."
 * formatEventPriceInline(event)  // "" (if free event)
 */
export function formatEventPriceInline(event: Event): string {
  if (!event.isPaid) {
    return "";
  }
  
  const price = event.price
    ? `${event.price} ${event.currency?.symbol ?? event.currencyCode ?? ""}`.trim()
    : "Платное";
    
  return ` Стоимость: ${price}.`;
}

/**
 * Get event price label for badges/cards
 * 
 * Same as formatEventPrice but intended for badge/pill components
 * where space is limited.
 */
export function getEventPriceLabel(event: Event): string {
  return formatEventPrice(event);
}

