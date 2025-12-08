import { respondError, respondJSON } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getGuestSessionId } from "@/lib/auth/guestSession";
import { deleteParticipant, updateParticipant } from "@/lib/services/participants";

type Params =
  | { params: { id: string; participantId: string } }
  | { params: Promise<{ id: string; participantId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { participantId } = await params;
    const currentUser = await getCurrentUser();
    const payload = await request.json();
    
    // Get guest session ID for permission check
    const guestSessionId = currentUser ? null : await getGuestSessionId();
    
    const participant = await updateParticipant(participantId, payload, currentUser, guestSessionId);
    return respondJSON({ participant });
  } catch (err) {
    return respondError(err);
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const { participantId } = await params;
    const currentUser = await getCurrentUser();
    
    // Get guest session ID for permission check
    const guestSessionId = currentUser ? null : await getGuestSessionId();
    
    await deleteParticipant(participantId, currentUser, guestSessionId);
    return respondJSON({ ok: true });
  } catch (err) {
    return respondError(err);
  }
}
