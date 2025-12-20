/**
 * Registration Control API
 * 
 * Allows event owner to manually toggle registration status
 * PUT /api/events/[id]/registration
 */

import { revalidatePath } from "next/cache";
import { respondError, respondJSON } from "@/lib/api/response";
import { getCurrentUserFromMiddleware } from "@/lib/auth/currentUser";
import { getEventById, updateEvent as updateEventRecord } from "@/lib/db/eventRepo";
import { UnauthorizedError, AuthError, NotFoundError } from "@/lib/errors";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const registrationToggleSchema = z.object({
  registrationManuallyClosed: z.boolean(),
});

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    
    // Get user from middleware (JWT already verified)
    const currentUser = await getCurrentUserFromMiddleware(request);
    
    if (!currentUser) {
      throw new UnauthorizedError("Авторизация обязательна");
    }
    
    // Parse payload
    const body = await request.json();
    const parsed = registrationToggleSchema.parse(body);
    
    // Check ownership
    const event = await getEventById(id);
    if (!event) {
      throw new NotFoundError("Event not found");
    }
    
    if (event.created_by_user_id !== currentUser.id) {
      throw new AuthError("Недостаточно прав для управления регистрацией", undefined, 403);
    }
    
    // Update registration status
    const updated = await updateEventRecord(id, {
      registrationManuallyClosed: parsed.registrationManuallyClosed,
    });
    
    if (!updated) {
      throw new NotFoundError("Event not found");
    }
    
    // Revalidate event page
    revalidatePath(`/events/${id}`);
    
    return respondJSON({ 
      success: true,
      registrationManuallyClosed: parsed.registrationManuallyClosed 
    });
  } catch (err) {
    return respondError(err);
  }
}
