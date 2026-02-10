import { revalidatePath } from "next/cache";
import { respondError, respondJSON } from "@/lib/api/response";
import { getCurrentUserFromMiddleware } from "@/lib/auth/currentUser";
import { resolveCurrentUser } from "@/lib/auth/resolveCurrentUser";
import { UnauthorizedError } from "@/lib/errors";
import { deleteEvent, getEventWithVisibility, hydrateEvent, updateEvent } from "@/lib/services/events";
import { getEventSlugById } from "@/lib/db/eventRepo";
import { withIdempotency, extractIdempotencyKey, isValidIdempotencyKey } from "@/lib/services/withIdempotency";
import { trackWriteAction } from "@/lib/telemetry/abuseTelemetry";
import { NextRequest } from "next/server";

// ❌ Edge Runtime не совместим с Supabase + revalidatePath
// Используем Node.js runtime с оптимизированными запросами

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/events/[id] - Single event read
 * 
 * ADR-001.1 Compliant: Uses resolveCurrentUser() for transport-agnostic auth.
 * SSOT §4.5 Compliant: Visibility enforcement via canViewEvent() includes
 * club-scoped visibility rules.
 * 
 * Error semantics:
 * - 404 for club events denied (prevents existence leakage)
 * - 403 for personal events denied
 */
export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    // ADR-001.1: Use canonical auth resolver for transport-agnostic auth
    const currentUser = await resolveCurrentUser(request);
    const event = await getEventWithVisibility(id, {
      currentUser,
      enforceVisibility: true,
    });
    const hydrated = await hydrateEvent(event);
    
    // For event owner: include effective entitlements for edit form hints
    // This avoids the need for a separate /entitlements endpoint
    if (currentUser && event.createdByUserId === currentUser.id) {
      const { getEffectiveEventEntitlements } = await import("@/lib/services/eventEntitlements");
      const entitlements = await getEffectiveEventEntitlements({
        userId: currentUser.id,
        eventId: id,
        clubId: event.clubId ?? undefined,
      });
      hydrated.effectiveMaxParticipants = entitlements.maxEventParticipants;
    }
    
    return respondJSON({ event: hydrated });
  } catch (err) {
    return respondError(err);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    
    // Get user from middleware (JWT already verified)
    const currentUser = await getCurrentUserFromMiddleware(request);
    
    if (!currentUser) {
      throw new UnauthorizedError("Авторизация обязательна");
    }
    
    // Extract idempotency key from headers
    const idempotencyKey = extractIdempotencyKey(request);
    
    // ⚡ NEW: Wrap with idempotency if key provided
    if (idempotencyKey && isValidIdempotencyKey(idempotencyKey)) {
      try {
        return await withIdempotency(
          {
            userId: currentUser.id,
            route: `PUT /api/events/${id}`,
            key: idempotencyKey,
          },
          async () => {
            // Extract confirm_credit from query params
            const url = new URL(request.url);
            const confirmCredit = url.searchParams.get("confirm_credit") === "1";
            
            const payload = await request.json();
            const updated = await updateEvent(id, payload, currentUser, confirmCredit);

            // Fire-and-forget: abuse telemetry
            trackWriteAction(currentUser.id, 'events.update');
            
            // Revalidate pages that display this event (slug-based URLs)
            const eventSlug = updated.slug || (await getEventSlugById(id));
            if (eventSlug) {
              revalidatePath(`/events/${eventSlug}`);        // Event detail page
              revalidatePath(`/events/${eventSlug}/edit`);   // Event edit page
            }
            revalidatePath("/events");              // Events list page
            
            return {
              status: 200,
              body: { success: true, data: { event: updated } },
            };
          }
        );
      } catch (err: any) {
        // Handle CreditConfirmationRequiredError (409)
        if (err.name === "CreditConfirmationRequiredError") {
          const error = err.payload;
          error.error.cta.href = `/api/events/${id}?confirm_credit=1`;
          
          return new Response(JSON.stringify(error), {
            status: 409,
            headers: { "Content-Type": "application/json" },
          });
        }
        
        // All other errors (500, 402, etc.)
        return respondError(err);
      }
    }
    
    // Fallback: no idempotency (shouldn't happen with new UI)
    const url = new URL(request.url);
    const confirmCredit = url.searchParams.get("confirm_credit") === "1";
    
    const payload = await request.json();
    const updated = await updateEvent(id, payload, currentUser, confirmCredit);

    // Fire-and-forget: abuse telemetry
    trackWriteAction(currentUser.id, 'events.update');
    
    // Revalidate pages that display this event (slug-based URLs)
    const slug = updated.slug || (await getEventSlugById(id));
    if (slug) {
      revalidatePath(`/events/${slug}`);        // Event detail page
      revalidatePath(`/events/${slug}/edit`);   // Event edit page
    }
    revalidatePath("/events");              // Events list page
    
    return respondJSON({ event: updated });
  } catch (err: any) {
    // Handle CreditConfirmationRequiredError (409)
    if (err.name === "CreditConfirmationRequiredError") {
      // Set correct CTA href for update flow
      const { id } = await params;
      const error = err.payload;
      error.error.cta.href = `/api/events/${id}?confirm_credit=1`;
      
      return new Response(JSON.stringify(error), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // Other errors (PaywallError, etc) handled by respondError
    return respondError(err);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    
    // Get user from middleware (JWT already verified)
    const currentUser = await getCurrentUserFromMiddleware(request);
    
    if (!currentUser) {
      throw new UnauthorizedError("Авторизация обязательна");
    }
    
    await deleteEvent(id, currentUser);

    // Fire-and-forget: abuse telemetry
    trackWriteAction(currentUser.id, 'events.delete');
    
    // Revalidate pages that displayed this event (slug-based URLs)
    const slug = await getEventSlugById(id);
    if (slug) {
      revalidatePath(`/events/${slug}`);   // Event detail page (will show 404)
    }
    revalidatePath("/events");         // Events list page
    
    return respondJSON({ ok: true });
  } catch (err) {
    return respondError(err);
  }
}
