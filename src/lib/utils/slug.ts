/**
 * Slug Generation Utility
 *
 * Single source of truth for slug generation across events and clubs.
 *
 * Format: {transliterated-title}-{short-uuid}
 * Example: "Оффроуд-выезд Алматы" + UUID 550e8400-... → offroad-vyezd-almaty-550e8400
 *
 * Per SSOT_SEO.md §3.1:
 * - Slugs MUST be human-readable, lowercase, hyphen-separated
 * - Slugs MUST be immutable after first publication
 * - Short UUID suffix guarantees uniqueness
 *
 * Supports: Russian + Kazakh Cyrillic alphabets
 *
 * @module lib/utils/slug
 */

// ============================================================================
// Transliteration Map (Russian + Kazakh Cyrillic → Latin)
// ============================================================================

const TRANSLITERATION_MAP: Record<string, string> = {
  // Russian alphabet (33 letters)
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",

  // Kazakh-specific letters (9 additional)
  ә: "a",
  ғ: "gh",
  қ: "q",
  ң: "ng",
  ө: "o",
  ұ: "u",
  ү: "u",
  һ: "h",
  і: "i",
};

// ============================================================================
// Functions
// ============================================================================

/**
 * Transliterate Cyrillic text to Latin.
 * Supports Russian + Kazakh alphabets.
 *
 * @param text - Input text (may contain Cyrillic, Latin, numbers, symbols)
 * @returns Transliterated text (Latin only)
 */
export function transliterate(text: string): string {
  return text
    .split("")
    .map((char) => {
      const lower = char.toLowerCase();
      if (lower in TRANSLITERATION_MAP) {
        const mapped = TRANSLITERATION_MAP[lower];
        // Preserve case for first letter of multi-char mappings
        return char === lower ? mapped : mapped.charAt(0).toUpperCase() + mapped.slice(1);
      }
      return char;
    })
    .join("");
}

/**
 * Generate a URL-safe slug from a title and UUID.
 *
 * Format: {transliterated-title}-{short-uuid}
 * - Title is transliterated, lowercased, hyphenated, max 60 chars
 * - Short UUID = first 8 hex chars (no dashes) for uniqueness
 *
 * @param title - Entity title (may contain Cyrillic)
 * @param id - UUID of the entity
 * @returns URL-safe slug (e.g. "offroad-vyezd-almaty-550e8400")
 */
export function generateSlug(title: string, id: string): string {
  const transliterated = transliterate(title);

  const normalized = transliterated
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove non-alphanumeric (except spaces & hyphens)
    .replace(/\s+/g, "-") // Spaces → hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-|-$/g, "") // Trim leading/trailing hyphens
    .slice(0, 60); // Max title part length

  const shortId = id.replace(/-/g, "").slice(0, 8);

  // Handle edge case: title produces empty string after normalization
  if (!normalized) {
    return shortId;
  }

  return `${normalized}-${shortId}`;
}
