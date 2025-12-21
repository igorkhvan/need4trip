/**
 * Event Visibility Helper
 * 
 * Centralized logic for event visibility checks.
 * Single source of truth for all visibility rules.
 * 
 * Architecture:
 * - canViewEvent() - Full check with DB queries (for single event)
 * - canViewInList() - Lightweight check without DB queries (for lists)
 * - isPubliclyVisible() - Quick check for public visibility (for filters)
 * - enforceEventVisibility() - Throws on access denial (for API)
 * 
 * Used by:
 * - API endpoints (getEventWithVisibility)
 * - Services (listVisibleEventsForUser)
 * - UI components (filters)
 * 
 * Similar to eventPermissions.ts (for registration logic)
 */

import { Event } from "@/lib/types/event";
import { CurrentUser } from "@/lib/auth/currentUser";
import { listEventIdsForUser } from "@/lib/db/participantRepo";
import { listAccessibleEventIds, upsertEventAccess } from "@/lib/db/eventAccessRepo";
import { log } from "@/lib/utils/logger";

export interface VisibilityCheckResult {
  canView: boolean;
  reason?: 'not_authenticated' | 'not_participant' | 'not_club_member' | 'no_access';
  message?: string;
  autoGranted?: boolean; // true if access was auto-granted for restricted events
}

/**
 * Check if user can view a single event (with DB queries)
 * 
 * Order of checks (early return pattern):
 * 1. Public visibility → always allowed (all users)
 * 2. Owner → always allowed (owner can see their own events)
 * 3. Unlisted → always allowed (anyone with direct link, including anonymous)
 * 4. Restricted requires authentication (anonymous users blocked)
 * 5. Participant/Access check (database lookup)
 * 6. Auto-grant for restricted (if enabled, creates access record)
 * 
 * @param event Event to check
 * @param currentUser Current user (or null if anonymous)
 * @param options Configuration options
 * @returns VisibilityCheckResult with canView flag and optional details
 */
export async function canViewEvent(
  event: Event,
  currentUser: CurrentUser | null,
  options?: {
    autoGrantAccessForRestricted?: boolean; // default: true
  }
): Promise<VisibilityCheckResult> {
  const autoGrant = options?.autoGrantAccessForRestricted ?? true;
  
  // 1. Public events are always visible
  if (event.visibility === "public") {
    return { canView: true };
  }
  
  // 2. Owner always has access
  if (currentUser && event.createdByUserId === currentUser.id) {
    return { canView: true };
  }
  
  // 3. Unlisted events are accessible to EVERYONE by direct link
  // This includes anonymous users - no authentication required
  if (event.visibility === "unlisted") {
    return { canView: true };
  }
  
  // 4. Restricted events require authentication
  // Anonymous users cannot view restricted events
  if (!currentUser) {
    return {
      canView: false,
      reason: 'not_authenticated',
      message: 'Недостаточно прав для просмотра события'
    };
  }
  
  // 5. Check if user has access (participant or explicitly granted)
  // At this point: event is 'restricted' and user is authenticated
  let allowed = false;
  try {
    const [participantEventIds, accessEventIds] = await Promise.all([
      listEventIdsForUser(currentUser.id),
      listAccessibleEventIds(currentUser.id),
    ]);
    const allowedIds = new Set<string>([...participantEventIds, ...accessEventIds]);
    allowed = allowedIds.has(event.id);
  } catch (err) {
    log.errorWithStack("Failed to check event visibility access", err, { eventId: event.id });
  }
  
  if (allowed) {
    return { canView: true };
  }
  
  // 6. For 'restricted' events, auto-grant access on first visit
  // Creates a record in event_user_access for future access
  if (event.visibility === "restricted" && autoGrant) {
    try {
      await upsertEventAccess(event.id, currentUser.id, "link");
      return { canView: true, autoGranted: true };
    } catch (err) {
      log.errorWithStack("Failed to upsert access for restricted event", err, { eventId: event.id });
    }
  }
  
  return {
    canView: false,
    reason: 'no_access',
    message: 'Недостаточно прав для просмотра события'
  };
}

/**
 * Check if event is publicly visible (lightweight, no DB)
 * 
 * Used when loading event lists without full access check.
 * Lightweight check without database queries.
 * 
 * Rules:
 * - visibility === "public" → true
 * - isClubEvent === true → false (club events never fully public, even if visibility=public)
 * 
 * @param event Event to check
 * @returns true if event is publicly visible to all users
 */
export function isPubliclyVisible(event: Event): boolean {
  return event.visibility === "public" && !event.isClubEvent;
}

/**
 * Check if user can see event in lists (lightweight, no extra DB queries)
 * 
 * Used for filtering event lists when participant/access IDs are already loaded.
 * Does NOT perform database queries for performance.
 * 
 * Rules:
 * 1. Public visibility (any) → visible
 * 2. Owner → visible
 * 3. Has participant/access → visible
 * 4. Otherwise → hidden
 * 
 * @param event Event to check
 * @param currentUser Current user (or null if anonymous)
 * @param participantEventIds Set of event IDs user is participant of
 * @param accessEventIds Set of event IDs user has explicit access to
 * @returns true if user can see this event in a list
 */
export function canViewInList(
  event: Event,
  currentUser: CurrentUser | null,
  participantEventIds: Set<string>,
  accessEventIds: Set<string>
): boolean {
  // 1. Public events are visible to everyone
  if (event.visibility === "public") {
    return true;
  }
  
  // 2. Owner's events are always visible
  if (currentUser && event.createdByUserId === currentUser.id) {
    return true;
  }
  
  // 3. Events with granted access (participant or explicit)
  if (participantEventIds.has(event.id) || accessEventIds.has(event.id)) {
    return true;
  }
  
  return false;
}

/**
 * Enforce visibility check (throws on failure)
 * 
 * Used in API endpoints and services where visibility MUST be enforced.
 * Throws AuthError if user cannot view the event.
 * 
 * @param event Event to check
 * @param currentUser Current user (or null if anonymous)
 * @param options Configuration options
 * @throws AuthError if user cannot view the event
 */
export async function enforceEventVisibility(
  event: Event,
  currentUser: CurrentUser | null,
  options?: {
    autoGrantAccessForRestricted?: boolean;
  }
): Promise<void> {
  const result = await canViewEvent(event, currentUser, options);
  
  if (!result.canView) {
    const { AuthError } = await import("@/lib/errors");
    throw new AuthError(
      result.message || "Недостаточно прав для просмотра события",
      undefined,
      403
    );
  }
}
