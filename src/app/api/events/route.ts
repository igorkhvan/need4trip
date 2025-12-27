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
  tab: z.enum(['all', 'upcoming', 'my']).default('all'),
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
    console.log("🟢 [API] GET /api/events START", {
      url: req.url,
      searchParams: Object.fromEntries(req.nextUrl.searchParams.entries()),
    });

    // 1. Validate query params
    const rawParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = eventsListQuerySchema.safeParse(rawParams);

    if (!parsed.success) {
      console.error("🔴 [API] Validation failed", parsed.error.errors);
      return respondJSON(
        { error: { code: "VALIDATION_ERROR", message: "Invalid query parameters", details: parsed.error.errors } },
        undefined,
        400
      );
    }

    const params = parsed.data;
    console.log("🟢 [API] Query params validated", params);

    // 2. Get current user (or null for anonymous)
    const currentUser = await getCurrentUser();
    console.log("🟢 [API] Current user", {
      userId: currentUser?.id,
      isAuthenticated: !!currentUser,
    });

    // 3. Call service layer (throws AuthError if tab=my without auth)
    console.log("🟢 [API] Calling service layer...");
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

    console.log("🟢 [API] Service returned", {
      eventsCount: result.events.length,
      meta: result.meta,
    });

    return respondJSON({
      events: result.events,
      meta: result.meta,
    });
  } catch (err) {
    console.error("🔴 [API] Error", err);
    return respondError(err);
  }
}

export async function POST(request: Request) {
  try {
    // Get user from middleware (JWT already verified)
    const currentUser = await getCurrentUserFromMiddleware(request);
    
    if (!currentUser) {
      throw new UnauthorizedError("Авторизация обязательна для создания события");
    }
    
    // Extract confirm_credit from query params
    const url = new URL(request.url);
    const confirmCredit = url.searchParams.get("confirm_credit") === "1";
    
    const payload = await request.json();
    const event = await createEvent(payload, currentUser, confirmCredit);
    
    return respondJSON({ event }, undefined, 201);
  } catch (err: any) {
    // Handle CreditConfirmationRequiredError (409)
    if (err.name === "CreditConfirmationRequiredError") {
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
