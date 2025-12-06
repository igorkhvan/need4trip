import { respondError, respondJSON } from "@/lib/api/response";
import { getCurrentUser, getCurrentUserSafe } from "@/lib/auth/currentUser";
import { AuthError } from "@/lib/errors";
import { createEvent, listVisibleEventsForUser } from "@/lib/services/events";

export async function GET() {
  try {
    const currentUser = await getCurrentUserSafe();
    const events = await listVisibleEventsForUser(currentUser?.id ?? null);
    return respondJSON({ events });
  } catch (err) {
    return respondError(err);
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AuthError("Авторизация обязательна для создания ивента", undefined, 401);
    }
    const payload = await request.json();
    const event = await createEvent(payload, currentUser);
    return respondJSON({ event }, 201);
  } catch (err) {
    return respondError(err);
  }
}
