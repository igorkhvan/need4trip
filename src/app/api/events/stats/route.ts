import { respondError, respondJSON } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getEventsStats } from "@/lib/services/events";
import { NextRequest } from "next/server";
import { z } from "zod";

// SSOT § 10: Stats endpoint uses in-process cache, NO Next.js cache
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * In-process cache for stats (TTL 60s, max 300 entries)
 * 
 * SSOT § 10:
 * - Public tabs (all/upcoming): key = public|tab|filters
 * - tab=my: key = userId|my|filters
 * 
 * Cleanup strategy: "cleanup on access" (no background timers)
 * - On every request: remove expired entries
 * - If size > MAX_ENTRIES: evict oldest entries by insertion order
 */

interface CacheEntry {
  payload: { total: number };
  expiresAt: number;
}

const statsCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60_000; // 60 seconds
const MAX_ENTRIES = 300;

/**
 * Cleanup expired entries and enforce size limit
 * Called on every request (deterministic, no setInterval)
 */
function cleanupCache(): void {
  const now = Date.now();
  
  // 1. Remove expired entries
  for (const [key, entry] of statsCache.entries()) {
    if (now >= entry.expiresAt) {
      statsCache.delete(key);
    }
  }
  
  // 2. Enforce max size (evict oldest entries if needed)
  if (statsCache.size > MAX_ENTRIES) {
    const keysToEvict = Array.from(statsCache.keys()).slice(0, statsCache.size - MAX_ENTRIES);
    for (const key of keysToEvict) {
      statsCache.delete(key);
    }
  }
}

/**
 * Build normalized cache key from filters
 * Stable ordering and normalization to maximize cache hit rate
 */
function buildFiltersKey(params: {
  tab: 'all' | 'upcoming' | 'my';
  search?: string;
  cityId?: string;
  categoryId?: string;
}): string {
  const parts: string[] = [params.tab];
  
  // Normalize search: trim, collapse whitespace, lowercase
  if (params.search) {
    const normalized = params.search.trim().replace(/\s+/g, ' ').toLowerCase();
    if (normalized) {
      parts.push(`search:${normalized}`);
    }
  }
  
  // Add optional filters in stable order
  if (params.cityId) {
    parts.push(`city:${params.cityId}`);
  }
  if (params.categoryId) {
    parts.push(`cat:${params.categoryId}`);
  }
  
  return parts.join('|');
}

/**
 * Zod schema for GET /api/events/stats query params
 */
const statsQuerySchema = z.object({
  tab: z.enum(['all', 'upcoming', 'my']).default('all'),
  search: z.string().trim().optional(),
  cityId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
});

/**
 * GET /api/events/stats
 * 
 * Returns total count of events matching filters (before pagination).
 * 
 * SSOT § 10: 60s in-process cache to reduce DB load.
 * - tab=all/upcoming: public key
 * - tab=my: user-specific key (requires auth, throws 401 if not authenticated)
 * 
 * Response: { total: number }
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Cleanup cache on every request (no background timers)
    cleanupCache();
    
    // 2. Validate query params
    const rawParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = statsQuerySchema.safeParse(rawParams);

    if (!parsed.success) {
      return respondJSON(
        { error: { code: "VALIDATION_ERROR", message: "Invalid query parameters", details: parsed.error.errors } },
        undefined,
        400
      );
    }

    const params = parsed.data;

    // 3. Get current user (or null for anonymous)
    const currentUser = await getCurrentUser();

    // 4. Enforce auth for tab=my BEFORE cache lookup
    if (params.tab === 'my' && !currentUser) {
      // Consistent error format (will be caught by respondError)
      const result = await getEventsStats(
        {
          tab: params.tab,
          search: params.search,
          cityId: params.cityId,
          categoryId: params.categoryId,
        },
        currentUser
      );
      return respondJSON(result);
    }

    // 5. Build normalized cache key
    const filtersKey = buildFiltersKey(params);
    const cacheKey = params.tab === 'my' 
      ? `${currentUser!.id}|my|${filtersKey}`
      : `public|${filtersKey}`;

    // 6. Check cache
    const cached = statsCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return respondJSON(cached.payload);
    }

    // 7. Call service layer (throws AuthError if tab=my without auth)
    const result = await getEventsStats(
      {
        tab: params.tab,
        search: params.search,
        cityId: params.cityId,
        categoryId: params.categoryId,
      },
      currentUser
    );

    // 8. Cache result (60s TTL)
    statsCache.set(cacheKey, {
      payload: result,
      expiresAt: Date.now() + CACHE_TTL,
    });

    return respondJSON(result);
  } catch (err) {
    return respondError(err);
  }
}

