import { revalidatePath } from "next/cache";
import { respondError, respondJSON } from "@/lib/api/response";
import { getCurrentUser, getCurrentUserFromMiddleware } from "@/lib/auth/currentUser";
import { UnauthorizedError } from "@/lib/errors";
import { deleteEvent, getEventWithVisibility, hydrateEvent, updateEvent } from "@/lib/services/events";

// ❌ Edge Runtime не совместим с Supabase + revalidatePath
// Используем Node.js runtime с оптимизированными запросами

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    // GET is public, but may need user context for visibility
    // Use getCurrentUser (not middleware) since GET is not protected
    const currentUser = await getCurrentUser();
    const event = await getEventWithVisibility(id, {
      currentUser,
      enforceVisibility: true,
    });
    const hydrated = await hydrateEvent(event);
    return respondJSON({ event: hydrated });
  } catch (err) {
    return respondError(err);
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    
    // Get user from middleware (JWT already verified)
    const currentUser = await getCurrentUserFromMiddleware(request);
    
    if (!currentUser) {
      throw new UnauthorizedError("Авторизация обязательна");
    }
    
    const payload = await request.json();
    const updated = await updateEvent(id, payload, currentUser);
    
    // Revalidate pages that display this event
    revalidatePath(`/events/${id}`);        // Event detail page
    revalidatePath(`/events/${id}/edit`);   // Event edit page
    revalidatePath("/events");              // Events list page
    
    return respondJSON({ event: updated });
  } catch (err) {
    return respondError(err);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    
    // Get user from middleware (JWT already verified)
    const currentUser = await getCurrentUserFromMiddleware(request);
    
    if (!currentUser) {
      throw new UnauthorizedError("Авторизация обязательна");
    }
    
    await deleteEvent(id, currentUser);
    
    // Revalidate pages that displayed this event
    revalidatePath(`/events/${id}`);   // Event detail page (will show 404)
    revalidatePath("/events");         // Events list page
    
    return respondJSON({ ok: true });
  } catch (err) {
    return respondError(err);
  }
}
