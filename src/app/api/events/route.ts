import { respondError, respondJSON } from "@/lib/api/response";
import { getCurrentUser, getCurrentUserSafe } from "@/lib/auth/currentUser";
import { UnauthorizedError } from "@/lib/errors";
import { createEvent, hydrateEvent, listEvents } from "@/lib/services/events";
import { NextRequest } from "next/server";

// Force dynamic rendering to prevent caching of events list
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);

    const result = await listEvents(page, limit);
    const hydrated = await Promise.all(result.events.map((e) => hydrateEvent(e)));
    
    return respondJSON({
      events: hydrated,
      total: result.total,
      hasMore: result.hasMore,
      page,
      limit,
    });
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
