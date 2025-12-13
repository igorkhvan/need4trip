import { respondError, respondJSON } from "@/lib/api/response";
import { getCurrentUser, getCurrentUserSafe } from "@/lib/auth/currentUser";
import { UnauthorizedError } from "@/lib/errors";
import { createEvent, hydrateEvent, listVisibleEventsForUser } from "@/lib/services/events";

export async function GET() {
  try {
    const currentUser = await getCurrentUserSafe();
    const events = await listVisibleEventsForUser(currentUser?.id ?? null);
    const hydrated = await Promise.all(events.map((e) => hydrateEvent(e)));
    return respondJSON({ events: hydrated });
  } catch (err) {
    return respondError(err);
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new UnauthorizedError("Авторизация обязательна для создания события");
    }
    const payload = await request.json();
    const event = await createEvent(payload, currentUser);
    return respondJSON({ event }, undefined, 201);
  } catch (err) {
    return respondError(err);
  }
}
