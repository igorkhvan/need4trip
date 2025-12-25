/**
 * Date & Time Utilities (CANONICAL - Single Source of Truth)
 * 
 * This module is THE ONLY source for date/time formatting and manipulation.
 * See: docs/ARCHITECTURE.md § 4 (Ownership Map)
 * 
 * CONSOLIDATED from:
 * - lib/utils/dates.ts (display formatting)
 * - lib/utils/date-time.ts (datetime-local picker utilities)
 * 
 * All functions support both Date objects and ISO strings for maximum flexibility.
 */

// ============================================================================
// SECTION 1: Parsing & Serialization
// ============================================================================

/**
 * Parse datetime-local string or ISO string to Date object
 * @param value String in format "YYYY-MM-DDTHH:mm" or ISO 8601
 * @returns Date object or null if invalid
 * @example parseDateTime("2025-12-24T14:30") // Date(2025, 11, 24, 14, 30)
 */
export function parseDateTime(value: string | null | undefined): Date | null {
  if (!value || typeof value !== "string") return null;
  
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}

/**
 * Serialize Date to datetime-local format (for HTML input)
 * @param date Date object
 * @returns String in format "YYYY-MM-DDTHH:mm" or empty string
 * @example serializeDateTime(new Date(2025, 11, 24, 14, 30)) // "2025-12-24T14:30"
 */
export function serializeDateTime(date: Date | null | undefined): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return "";
  
  try {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return "";
  }
}

// ============================================================================
// SECTION 2: Display Formatting (UI)
// ============================================================================

/**
 * Helper: Convert string or Date to Date object
 */
function toDate(input: Date | string): Date {
  return input instanceof Date ? input : new Date(input);
}

/**
 * Format date and time for display (long format)
 * @param input Date object or ISO string
 * @returns String like "24 декабря 2025, 14:30"
 * @example formatDateTime("2025-12-24T14:30") // "24 декабря 2025, 14:30"
 */
export function formatDateTime(input: Date | string): string {
  const d = toDate(input);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format date and time for display (short format)
 * @param input Date object or ISO string
 * @returns String like "24 дек, 14:30"
 * @example formatDateTimeShort("2025-12-24T14:30") // "24 дек, 14:30"
 */
export function formatDateTimeShort(input: Date | string): string {
  const d = toDate(input);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format date only (long format)
 * @param input Date object or ISO string
 * @returns String like "24 декабря 2025"
 * @example formatDate("2025-12-24") // "24 декабря 2025"
 */
export function formatDate(input: Date | string): string {
  const d = toDate(input);
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * Format date only (short format)
 * @param input Date object or ISO string
 * @returns String like "24 дек 2025"
 * @example formatDateShort("2025-12-24") // "24 дек 2025"
 */
export function formatDateShort(input: Date | string): string {
  const d = toDate(input);
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format time only
 * @param input Date object or ISO string
 * @returns String like "14:30"
 * @example formatTime(new Date(2025, 11, 24, 14, 30)) // "14:30"
 */
export function formatTime(input: Date | string): string {
  const d = toDate(input);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

// ============================================================================
// SECTION 3: Date Manipulation
// ============================================================================

/**
 * Round minutes to nearest step
 * @param date Date to round
 * @param step Step size in minutes (5, 10, 15, 30)
 * @returns New Date with rounded minutes
 * @example roundMinutes(new Date(2025, 11, 24, 14, 33), 15) // 14:30
 */
export function roundMinutes(date: Date, step: number = 15): Date {
  const rounded = new Date(date);
  const minutes = rounded.getMinutes();
  const roundedMinutes = Math.round(minutes / step) * step;
  
  rounded.setMinutes(roundedMinutes);
  rounded.setSeconds(0);
  rounded.setMilliseconds(0);
  
  return rounded;
}

/**
 * Combine date (from calendar) and time string (from selector)
 * @param date Date from calendar picker
 * @param timeString Time in format "HH:mm"
 * @returns New Date with combined date and time
 * @example combineDateTime(new Date(2025, 11, 24), "14:30") // Date(2025, 11, 24, 14, 30)
 */
export function combineDateTime(date: Date, timeString: string): Date {
  const result = new Date(date);
  
  const [hoursStr, minutesStr] = timeString.split(":");
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  
  if (!isNaN(hours) && !isNaN(minutes)) {
    result.setHours(hours, minutes, 0, 0);
  }
  
  return result;
}

/**
 * Add hours to date
 * @param date Source date
 * @param hours Number of hours to add
 * @returns New Date object
 * @example addHours(new Date(2025, 11, 24, 14, 30), 1) // Date(2025, 11, 24, 15, 30)
 */
export function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

// ============================================================================
// SECTION 4: Validation & Checks
// ============================================================================

/**
 * Calculate days until event
 * @param dateTime Date or ISO string
 * @returns Number of days (positive = future, negative = past)
 * @example getDaysUntil("2025-12-31") // 6 (if today is Dec 25)
 */
export function getDaysUntil(dateTime: Date | string): number {
  const eventDate = toDate(dateTime);
  const now = new Date();
  const diff = eventDate.getTime() - now.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Check if event has already started
 * @param dateTime Date or ISO string
 * @returns true if event is in the past
 */
export function isEventStarted(dateTime: Date | string): boolean {
  return getDaysUntil(dateTime) < 0;
}

/**
 * Check if event is starting soon (within 7 days)
 * @param dateTime Date or ISO string
 * @returns true if event starts in 0-7 days
 */
export function isEventStartingSoon(dateTime: Date | string): boolean {
  const days = getDaysUntil(dateTime);
  return days >= 0 && days <= 7;
}

/**
 * Check if date is within min/max range
 * @param date Date to check
 * @param minDate Minimum date (optional)
 * @param maxDate Maximum date (optional)
 * @returns true if date is in range
 */
export function isDateInRange(
  date: Date | null,
  minDate?: Date | null,
  maxDate?: Date | null
): boolean {
  if (!date) return false;
  
  const dateTime = date.getTime();
  
  if (minDate && dateTime < minDate.getTime()) return false;
  if (maxDate && dateTime > maxDate.getTime()) return false;
  
  return true;
}

/**
 * Check if date is in the future (with tolerance)
 * @param date Date to check
 * @param toleranceMinutes Grace period in minutes (default: 5)
 * @returns true if date is in future or within tolerance
 */
export function isInFuture(date: Date | null, toleranceMinutes: number = 5): boolean {
  if (!date) return false;
  
  const now = new Date();
  const minAllowedDate = new Date(now.getTime() - toleranceMinutes * 60 * 1000);
  
  return date.getTime() >= minAllowedDate.getTime();
}

// ============================================================================
// SECTION 5: Generators & Helpers
// ============================================================================

/**
 * Generate time slots for dropdown selector
 * @param step Step size in minutes (5, 10, 15, 30)
 * @returns Array of time options [{value: "HH:mm", label: "HH:mm"}]
 * @example generateTimeSlots(30) // [{value: "00:00", label: "00:00"}, ...]
 */
export function generateTimeSlots(step: number = 15): Array<{ value: string; label: string }> {
  const slots: Array<{ value: string; label: string }> = [];
  
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += step) {
      const hourStr = String(hour).padStart(2, "0");
      const minuteStr = String(minute).padStart(2, "0");
      const time = `${hourStr}:${minuteStr}`;
      
      slots.push({
        value: time,
        label: time,
      });
    }
  }
  
  return slots;
}

/**
 * Get current time rounded to nearest step
 * @param step Step size in minutes (default: 15)
 * @returns Date with rounded minutes
 * @example getNowRounded(15) // If now is 14:33, returns 14:30
 */
export function getNowRounded(step: number = 15): Date {
  return roundMinutes(new Date(), step);
}

/**
 * Extract time string from Date (alias for formatTime)
 * @param date Date object
 * @returns Time string "HH:mm"
 * @deprecated Use formatTime() instead
 */
export function extractTime(date: Date | null | undefined): string {
  return formatTime(date || new Date());
}
