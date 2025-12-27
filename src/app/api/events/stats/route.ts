import { respondError, respondJSON } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getEventsStats } from "@/lib/services/events";
import { NextRequest } from "next/server";
import { z } from "zod";

// SSOT § 10: Stats endpoint uses in-process cache, NO Next.js cache
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * In-process cache for stats (TTL 60s)
 * 
 * SSOT § 10:
 * - Public tabs (all/upcoming): key = public|tab|filters
 * - tab=my: key = userId|tab|filters
 */
const statsCache = new Map<string, { total: number; expires: number }>();

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
    // 1. Validate query params
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

    // 2. Get current user (or null for anonymous)
    const currentUser = await getCurrentUser();

    // 3. Build cache key
    const filtersKey = `${params.tab}|${params.search ?? ''}|${params.cityId ?? ''}|${params.categoryId ?? ''}`;
    let cacheKey: string;

    if (params.tab === 'my') {
      if (!currentUser) {
        // tab=my without auth: service layer will throw 401
        // But we can short-circuit here for clarity
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
      cacheKey = `${currentUser.id}|${filtersKey}`;
    } else {
      cacheKey = `public|${filtersKey}`;
    }

    // 4. Check cache
    const cached = statsCache.get(cacheKey);
    if (cached && Date.now() < cached.expires) {
      return respondJSON({ total: cached.total });
    }

    // 5. Call service layer (throws AuthError if tab=my without auth)
    const result = await getEventsStats(
      {
        tab: params.tab,
        search: params.search,
        cityId: params.cityId,
        categoryId: params.categoryId,
      },
      currentUser
    );

    // 6. Cache result (60s TTL)
    statsCache.set(cacheKey, { total: result.total, expires: Date.now() + 60_000 });

    return respondJSON(result);
  } catch (err) {
    return respondError(err);
  }
}

