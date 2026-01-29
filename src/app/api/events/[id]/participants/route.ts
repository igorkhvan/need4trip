import { revalidatePath } from "next/cache";
import { respondError, respondJSON } from "@/lib/api/response";
import { resolveCurrentUser } from "@/lib/auth/resolveCurrentUser";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getOrCreateGuestSessionId } from "@/lib/auth/guestSession";
import { getEventWithVisibility } from "@/lib/services/events";
import { registerParticipant } from "@/lib/services/participants";
import { listParticipants as listParticipantsRepo } from "@/lib/db/participantRepo";
import { mapDbParticipantToDomain } from "@/lib/mappers";

// ❌ Edge Runtime не совместим с revalidatePath
// Используем Node.js runtime с оптимизированными запросами

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/events/[id]/participants - Event participants list
 * 
 * ADR-001.1 Compliant: Uses resolveCurrentUser() for transport-agnostic auth.
 * SSOT §4.5 Compliant: Visibility enforcement via canViewEvent() includes
 * club-scoped visibility rules.
 * 
 * SECURITY: Visibility check MUST complete BEFORE querying participants
 * to prevent participant data leakage for private club events.
 * 
 * Error semantics:
 * - 404 for club events denied (prevents existence leakage)
 * - 403 for personal events denied
 */
export async function GET(request: Request, context: Params) {
  try {
    const { id } = await context.params;
    
    // ADR-001.1: Use canonical auth resolver for transport-agnostic auth
    const currentUser = await resolveCurrentUser(request);
    
    // SECURITY: Resolve event and enforce visibility FIRST
    // Do NOT load participants until visibility is verified
    // This prevents participant data leakage for private club events
    await getEventWithVisibility(id, { currentUser, enforceVisibility: true });
    
    // Only AFTER successful visibility check, query participants
    const participants = await listParticipantsRepo(id);
    const mappedParticipants = participants.map(mapDbParticipantToDomain);
    
    return respondJSON({ participants: mappedParticipants });
  } catch (err) {
    return respondError(err);
  }
}

export async function POST(request: Request, context: Params) {
  try {
    const { id } = await context.params;
    
    // POST /api/events/[id]/participants uses Optional Auth pattern:
    // - Middleware doesn't block this route (allows guest registrations)
    // - Check JWT directly from cookies for authenticated users
    // - Fallback to guest session if not authenticated
    
    let currentUser = await getCurrentUser();
    let guestSessionId: string | null = null;
    
    if (!currentUser) {
      // No authenticated user - create guest session
      guestSessionId = await getOrCreateGuestSessionId();
    }
    
    const payload = await request.json();
    const participant = await registerParticipant(id, payload, currentUser, guestSessionId);
    
    // Revalidate event page to show updated participants list
    revalidatePath(`/events/${id}`);
    
    return respondJSON({ participant }, undefined, 201);
  } catch (err: unknown) {
    return respondError(err);
  }
}
