import { respondError, respondJSON } from "@/lib/api/response";
import { getCurrentUser, getCurrentUserFromMiddleware } from "@/lib/auth/currentUser";
import { UnauthorizedError } from "@/lib/errors";
import { createEvent, listVisibleEventsForUserPaginated } from "@/lib/services/events";
import { NextRequest } from "next/server";
import { z } from "zod";

// Force dynamic rendering to prevent caching of events list (SSOT § 10)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Zod schema for GET /api/events query params (SSOT § 10)
 */
const eventsListQuerySchema = z.object({
  tab: z.enum(['all', 'upcoming', 'my']).default('upcoming'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  sort: z.enum(['date', 'name']).default('date'),
  search: z.string().trim().optional(),
  cityId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
});

/**
 * GET /api/events
 * 
 * Returns paginated list of events visible to current user.
 * 
 * SSOT § 10: Server-side pagination, offset-based.
 * - tab=all: public events
 * - tab=upcoming: public + future events
 * - tab=my: owner/participant/access events (requires auth, throws 401 if not authenticated)
 * 
 * Response: { events: EventListItem[], meta: { total, page, limit, totalPages, hasMore, nextCursor } }
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Validate query params
    const rawParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = eventsListQuerySchema.safeParse(rawParams);

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

    // 3. Call service layer (throws AuthError if tab=my without auth)
    const result = await listVisibleEventsForUserPaginated(
      {
        filters: {
          tab: params.tab,
          search: params.search,
          cityId: params.cityId,
          categoryId: params.categoryId,
        },
        sort: { sort: params.sort },
        pagination: { page: params.page, limit: params.limit },
      },
      currentUser
    );

    return respondJSON({
      events: result.events,
      meta: result.meta,
    });
  } catch (err) {
    return respondError(err);
  }
}

export async function POST(request: Request) {
  try {
    console.log('[API /events POST] Starting event creation');
    
    // Get user from middleware (JWT already verified)
    const currentUser = await getCurrentUserFromMiddleware(request);
    console.log('[API /events POST] Current user:', currentUser?.id, currentUser?.name);
    
    if (!currentUser) {
      console.log('[API /events POST] ❌ No current user - throwing UnauthorizedError');
      throw new UnauthorizedError("Авторизация обязательна для создания события");
    }
    
    // Extract confirm_credit from query params
    const url = new URL(request.url);
    const confirmCredit = url.searchParams.get("confirm_credit") === "1";
    console.log('[API /events POST] Confirm credit:', confirmCredit);
    
    const payload = await request.json();
    console.log('[API /events POST] Received payload:', JSON.stringify(payload, null, 2));
    
    const event = await createEvent(payload, currentUser, confirmCredit);
    console.log('[API /events POST] ✅ Event created successfully:', { 
      id: event.id, 
      title: event.title,
      maxParticipants: event.maxParticipants,
      clubId: event.clubId 
    });
    
    const response = respondJSON({ event }, undefined, 201);
    console.log('[API /events POST] Returning response with event.id:', event.id);
    return response;
  } catch (err: any) {
    console.log('[API /events POST] ❌ Error caught:', err.name, err.message);
    
    // Handle CreditConfirmationRequiredError (409)
    if (err.name === "CreditConfirmationRequiredError") {
      console.log('[API /events POST] Credit confirmation required (409)');
      // Set correct CTA href for create flow
      const url = new URL(request.url);
      const error = err.payload;
      error.error.cta.href = `${url.pathname}?confirm_credit=1`;
      
      return new Response(JSON.stringify(error), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // Other errors (PaywallError, etc) handled by respondError
    return respondError(err);
  }
}
