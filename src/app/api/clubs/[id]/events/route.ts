/**
 * API-057: List Club Events
 * 
 * SSOT_API.md v1.7.0:
 * - GET /api/clubs/[id]/events
 * - Lists events belonging to a specific club
 * - Pagination (page, limit) + sorting by startAt
 * - Authorization: Club members only (owner/admin/member)
 * - Archived clubs: Read-only semantics (listing still works)
 * 
 * SSOT_CLUBS_DOMAIN.md §8.3 Whitelist:
 * - Reading club data (including events) is ALLOWED for archived clubs
 */

import { respondError, respondJSON } from "@/lib/api/response";
import { resolveCurrentUser } from "@/lib/auth/resolveCurrentUser";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/errors";
import { getUserClubRole } from "@/lib/db/clubMemberRepo";
import { getClubById } from "@/lib/db/clubRepo";
import { listClubEvents as listClubEventsRepo } from "@/lib/db/eventRepo";
import { mapDbEventToDomain } from "@/lib/mappers";
import { hydrateCitiesAndCurrencies, hydrateEventCategories, hydrateVehicleTypes } from "@/lib/utils/hydration";
import { NextRequest } from "next/server";
import { z } from "zod";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Params = { params: Promise<{ id: string }> };

/**
 * Query params schema for club events listing
 */
const clubEventsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

/**
 * GET /api/clubs/[id]/events
 * 
 * Returns paginated list of events for a specific club.
 * 
 * Authorization:
 * - Requires authentication
 * - User MUST be a club member (owner/admin/member)
 * - pending role = FORBIDDEN (403)
 * 
 * Archived clubs:
 * - Listing is ALLOWED (read-only operation)
 * - No mutation implied
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id: clubId } = await params;

    // 1. Validate query params
    const rawParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = clubEventsQuerySchema.safeParse(rawParams);

    if (!parsed.success) {
      return respondJSON(
        { error: { code: "VALIDATION_ERROR", message: "Invalid query parameters", details: parsed.error.errors } },
        undefined,
        400
      );
    }

    const { page, limit } = parsed.data;

    // 2. Authentication required
    // Canonical auth resolution (ADR-001)
    const currentUser = await resolveCurrentUser(request);
    if (!currentUser) {
      throw new UnauthorizedError("Авторизация обязательна для просмотра событий клуба");
    }

    // 3. Verify club exists
    const club = await getClubById(clubId);
    if (!club) {
      throw new NotFoundError("Клуб не найден");
    }

    // 4. Authorization: User must be a club member (not pending)
    // SSOT_CLUBS_EVENTS_ACCESS.md §2: pending role has NO elevated permissions
    const role = await getUserClubRole(clubId, currentUser.id);
    
    if (!role) {
      // Not a member at all
      throw new ForbiddenError("Доступ к событиям клуба разрешён только участникам клуба");
    }

    // Note: getUserClubRole already returns null for pending, but explicit check for clarity
    // SSOT: pending is treated as insufficient for club operations

    // 5. Fetch events (archived clubs: read allowed per SSOT_CLUBS_DOMAIN.md §8.3)
    const result = await listClubEventsRepo(clubId, page, limit);

    // 6. Map and hydrate events
    const events = result.data.map(mapDbEventToDomain);

    // Hydrate cities, currencies, categories, vehicle types
    const [hydratedWithCity] = await Promise.all([
      hydrateCitiesAndCurrencies(events),
    ]);
    
    let hydratedEvents = hydratedWithCity;
    
    const [hydratedWithCategory] = await hydrateEventCategories(hydratedEvents);
    if (hydratedWithCategory) {
      hydratedEvents = await hydrateEventCategories(hydratedEvents);
    }
    
    hydratedEvents = await hydrateVehicleTypes(hydratedEvents);

    // 7. Calculate pagination meta
    const totalPages = Math.ceil(result.total / limit);
    const hasMore = page < totalPages;

    return respondJSON({
      events: hydratedEvents,
      meta: {
        total: result.total,
        page,
        limit,
        totalPages,
        hasMore,
      },
      club: {
        id: club.id,
        name: club.name,
        isArchived: club.archived_at !== null,
      },
    });
  } catch (err) {
    return respondError(err);
  }
}
