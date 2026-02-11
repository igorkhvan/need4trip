/**
 * Runtime Configuration — Public Base URL
 *
 * Per SSOT_SEO.md §20: single source of base URL.
 * Hardcoded domain strings in other files are FORBIDDEN.
 *
 * IMPORTANT: This module is imported by BOTH server and client components.
 * Do NOT add server-only imports (fs, crypto, db clients, etc.) here.
 */

/**
 * Returns the canonical public base URL (no trailing slash).
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_APP_URL env var (set in Vercel / .env.local)
 *   2. Hardcoded fallback: https://need4trip.app
 */
export function getPublicBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ||
    "https://need4trip.app"
  );
}
