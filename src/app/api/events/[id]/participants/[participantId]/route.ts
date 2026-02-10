import { revalidatePath } from "next/cache";
import { respondError, respondJSON } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getGuestSessionId } from "@/lib/auth/guestSession";
import { getEventSlugById } from "@/lib/db/eventRepo";
import { deleteParticipant, updateParticipant } from "@/lib/services/participants";

type Params = { params: Promise<{ id: string; participantId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id, participantId } = await params;
    
    // PATCH uses Optional Auth pattern:
    // - Middleware doesn't block this route (allows guest editing)
    // - Check JWT directly from cookies for authenticated users
    // - Fallback to guest session if not authenticated
    let currentUser = await getCurrentUser();
    let guestSessionId: string | null = null;
    
    if (!currentUser) {
      // No authenticated user - check guest session
      guestSessionId = await getGuestSessionId();
    }
    
    const payload = await request.json();
    const participant = await updateParticipant(participantId, payload, currentUser, guestSessionId);
    
    // Revalidate event page to show updated participant data (slug-based URLs)
    const eventSlug = await getEventSlugById(id);
    if (eventSlug) revalidatePath(`/events/${eventSlug}`);
    
    return respondJSON({ participant });
  } catch (err) {
    return respondError(err);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id, participantId } = await params;
    
    // DELETE uses Optional Auth pattern:
    // - Middleware doesn't block this route (allows guest deletion)
    // - Check JWT directly from cookies for authenticated users
    // - Fallback to guest session if not authenticated
    let currentUser = await getCurrentUser();
    let guestSessionId: string | null = null;
    
    if (!currentUser) {
      // No authenticated user - check guest session
      guestSessionId = await getGuestSessionId();
    }
    
    await deleteParticipant(participantId, currentUser, guestSessionId);
    
    // Revalidate event page to show updated participants list (slug-based URLs)
    const slugForRevalidation = await getEventSlugById(id);
    if (slugForRevalidation) revalidatePath(`/events/${slugForRevalidation}`);
    
    return respondJSON({ ok: true });
  } catch (err) {
    return respondError(err);
  }
}
