import { revalidatePath } from "next/cache";
import { respondError, respondJSON } from "@/lib/api/response";
import { getCurrentUser, getCurrentUserFromMiddleware } from "@/lib/auth/currentUser";
import { getOrCreateGuestSessionId } from "@/lib/auth/guestSession";
import { getEventWithVisibility } from "@/lib/services/events";
import { listParticipants, registerParticipant } from "@/lib/services/participants";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: Params) {
  try {
    const { id } = await context.params;
    const currentUser = await getCurrentUser();
    await getEventWithVisibility(id, { currentUser, enforceVisibility: true });
    const participants = await listParticipants(id);
    return respondJSON({ participants });
  } catch (err) {
    return respondError(err);
  }
}

export async function POST(request: Request, context: Params) {
  try {
    const { id } = await context.params;
    
    // POST /api/events/[id]/participants is special:
    // - Middleware requires auth for POST
    // - BUT we want to allow guest registrations
    // - Solution: Check middleware user first, fallback to guest session
    
    let currentUser = await getCurrentUserFromMiddleware(request);
    let guestSessionId: string | null = null;
    
    if (!currentUser) {
      // No authenticated user - create guest session
      guestSessionId = await getOrCreateGuestSessionId();
    }
    
    const payload = await request.json();
    const participant = await registerParticipant(id, payload, currentUser, guestSessionId);
    
    // Revalidate event page to show updated participants list
    revalidatePath(`/events/${id}`);
    
    return respondJSON({ participant }, undefined, 201);
  } catch (err: unknown) {
    return respondError(err);
  }
}
