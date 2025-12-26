import { respondError, respondJSON } from "@/lib/api/response";
import { getCurrentUser, getCurrentUserFromMiddleware } from "@/lib/auth/currentUser";
import { UnauthorizedError } from "@/lib/errors";
import { createEvent, hydrateEvent, listVisibleEventsForUser } from "@/lib/services/events";
import { NextRequest } from "next/server";

// Force dynamic rendering to prevent caching of events list
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/events
 * 
 * Returns list of events visible to current user.
 * 
 * Security:
 * - Anonymous users: only public events
 * - Authenticated users: public + owned + participant + restricted with access
 * 
 * Pagination applied at application level after visibility filtering.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Get current user (or null for anonymous)
    const currentUser = await getCurrentUser();
    
    // 2. Load events with proper visibility filtering
    const allVisibleEvents = await listVisibleEventsForUser(currentUser?.id ?? null);
    
    // 3. Apply pagination at application level
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);
    const start = (page - 1) * limit;
    const end = start + limit;
    
    const paginatedEvents = allVisibleEvents.slice(start, end);
    const hydrated = await Promise.all(paginatedEvents.map((e) => hydrateEvent(e)));
    
    return respondJSON({
      events: hydrated,
      total: allVisibleEvents.length,
      hasMore: end < allVisibleEvents.length,
      page,
      limit,
    });
  } catch (err) {
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
