/**
 * Text utilities for SEO / Open Graph metadata generation.
 *
 * Canonical owner: lib/utils/text.ts
 * See SSOT_ARCHITECTURE.md §3.2 — Ownership Map.
 */

/**
 * Strips HTML tags from a string, returning plain text.
 * Used for generating og:description from rich-text content.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')   // <br> → space (not collapse)
    .replace(/<\/p>/gi, ' ')         // </p> → space (paragraph break)
    .replace(/<\/li>/gi, ' ')        // </li> → space
    .replace(/<[^>]*>/g, '')         // Remove remaining tags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&hellip;/gi, '…')
    .replace(/&#\d+;/gi, '')         // Remove remaining numeric entities
    .replace(/\s+/g, ' ')           // Normalize whitespace
    .trim();
}

/**
 * Truncates text to maxLength, breaking at word boundary.
 * Appends "..." if truncated.
 */
export function truncateText(text: string, maxLength: number = 160): string {
  if (text.length <= maxLength) return text;

  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  // Break at word boundary if we have a reasonable break point (>60% of length)
  const breakPoint = lastSpace > maxLength * 0.6 ? lastSpace : maxLength;

  return truncated.slice(0, breakPoint).trimEnd() + '...';
}
