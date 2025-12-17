import { revalidatePath } from "next/cache";
import { respondError, respondJSON } from "@/lib/api/response";
import { getCurrentUserFromMiddleware } from "@/lib/auth/currentUser";
import { getGuestSessionId } from "@/lib/auth/guestSession";
import { deleteParticipant, updateParticipant } from "@/lib/services/participants";

type Params = { params: Promise<{ id: string; participantId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id, participantId } = await params;
    
    // PATCH can be done by authenticated user OR guest
    // Middleware doesn't block this - check both
    let currentUser = await getCurrentUserFromMiddleware(request);
    let guestSessionId: string | null = null;
    
    if (!currentUser) {
      // No authenticated user - check guest session
      guestSessionId = await getGuestSessionId();
    }
    
    const payload = await request.json();
    const participant = await updateParticipant(participantId, payload, currentUser, guestSessionId);
    
    // Revalidate event page to show updated participant data
    revalidatePath(`/events/${id}`);
    
    return respondJSON({ participant });
  } catch (err) {
    return respondError(err);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id, participantId } = await params;
    
    // DELETE can be done by authenticated user OR guest
    // Middleware doesn't block this - check both
    let currentUser = await getCurrentUserFromMiddleware(request);
    let guestSessionId: string | null = null;
    
    if (!currentUser) {
      // No authenticated user - check guest session
      guestSessionId = await getGuestSessionId();
    }
    
    await deleteParticipant(participantId, currentUser, guestSessionId);
    
    // Revalidate event page to show updated participants list
    revalidatePath(`/events/${id}`);
    
    return respondJSON({ ok: true });
  } catch (err) {
    return respondError(err);
  }
}
