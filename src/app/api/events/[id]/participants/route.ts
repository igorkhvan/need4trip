import { revalidatePath } from "next/cache";
import { respondError, respondJSON } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/currentUser";
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
    const currentUser = await getCurrentUser();
    const payload = await request.json();
    
    // Get or create guest session ID for non-authenticated users
    const guestSessionId = currentUser ? null : await getOrCreateGuestSessionId();
    
    const participant = await registerParticipant(id, payload, currentUser, guestSessionId);
    
    // Revalidate event page to show updated participants list
    revalidatePath(`/events/${id}`);
    
    return respondJSON({ participant }, undefined, 201);
  } catch (err: unknown) {
    return respondError(err);
  }
}
