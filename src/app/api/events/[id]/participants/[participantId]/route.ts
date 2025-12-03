import { respondError, respondJSON } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { deleteParticipant, updateParticipant } from "@/lib/services/participants";

type Params =
  | { params: { id: string; participantId: string } }
  | { params: Promise<{ id: string; participantId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { participantId } = await params;
    const currentUser = await getCurrentUser();
    const payload = await request.json();
    const participant = await updateParticipant(participantId, payload, currentUser);
    return respondJSON({ participant });
  } catch (err) {
    return respondError(err);
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const { participantId } = await params;
    const currentUser = await getCurrentUser();
    await deleteParticipant(participantId, currentUser);
    return respondJSON({ ok: true });
  } catch (err) {
    return respondError(err);
  }
}
