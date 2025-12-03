import { respondError, respondJSON } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { deleteEvent, getEvent, updateEvent } from "@/lib/services/events";

type Params = { params: { id: string } } | { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    const event = await getEvent(id);
    return respondJSON({ event });
  } catch (err) {
    return respondError(err);
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    const payload = await request.json();
    const updated = await updateEvent(id, payload, currentUser);
    return respondJSON({ event: updated });
  } catch (err) {
    return respondError(err);
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    await deleteEvent(id, currentUser);
    return respondJSON({ ok: true });
  } catch (err) {
    return respondError(err);
  }
}
