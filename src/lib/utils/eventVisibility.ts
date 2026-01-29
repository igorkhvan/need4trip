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
 * Club-Scoped Events (SSOT §4.5):
 * - Club members (owner/admin/member) see ALL club events regardless of visibility
 * - Non-members (pending/guest) of private clubs see NO events
 * - Non-members of public clubs see ONLY public events
 * - Pending role is treated as non-member
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
import { getClubById } from "@/lib/db/clubRepo";
import { getMember } from "@/lib/db/clubMemberRepo";

export interface VisibilityCheckResult {
  canView: boolean;
  reason?: 'not_authenticated' | 'not_participant' | 'not_club_member' | 'no_access' | 'club_not_found' | 'private_club_non_member';
  message?: string;
  autoGranted?: boolean; // true if access was auto-granted for restricted events
  /**
   * For club-scoped event denials, this flag indicates the error should be
   * returned as NOT_FOUND (404) instead of FORBIDDEN (403) to prevent
   * existence leakage of private club events.
   */
  hideExistence?: boolean;
}

/**
 * Check if user can view a single event (with DB queries)
 * 
 * SSOT §4.5 Club-Scoped Event Visibility:
 * - Club members (owner/admin/member) see ALL club events regardless of visibility
 * - Non-members (pending/guest) of private clubs see NO events (404)
 * - Non-members of public clubs see ONLY public events (404 for non-public)
 * - Pending role is treated as non-member
 * 
 * Personal Event Visibility (non-club events):
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
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CLUB-SCOPED EVENT VISIBILITY (SSOT §4.5)
  // ═══════════════════════════════════════════════════════════════════════════
  // Club events have separate visibility rules that take precedence over
  // personal event visibility rules.
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (event.clubId) {
    const clubVisibilityResult = await checkClubEventVisibility(event, currentUser);
    if (clubVisibilityResult !== null) {
      return clubVisibilityResult;
    }
    // If clubVisibilityResult is null, fall through to personal visibility
    // (this happens when club member views the event - they have full access)
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PERSONAL EVENT VISIBILITY (non-club events)
  // ═══════════════════════════════════════════════════════════════════════════
  
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
 * Check club event visibility per SSOT §4.5
 * 
 * Decision Table (SSOT §4.5):
 * | Viewer              | Club Visibility | Event Visibility | Sees Event |
 * |---------------------|-----------------|------------------|------------|
 * | Member/Admin/Owner  | any             | any              | ✅         |
 * | Pending             | private         | any              | ❌ (404)   |
 * | Pending             | public          | public           | ✅         |
 * | Pending             | public          | non-public       | ❌ (404)   |
 * | Guest               | private         | any              | ❌ (404)   |
 * | Guest               | public          | public           | ✅         |
 * | Guest               | public          | non-public       | ❌ (404)   |
 * 
 * @param event Event with clubId (must be club-scoped)
 * @param currentUser Current user (or null for guest)
 * @returns VisibilityCheckResult if denied/allowed via club rules, or null if viewer is club member (full access)
 * @internal
 */
async function checkClubEventVisibility(
  event: Event,
  currentUser: CurrentUser | null
): Promise<VisibilityCheckResult | null> {
  if (!event.clubId) {
    // Not a club event - should not be called
    return null;
  }
  
  // 1. Resolve club
  const club = await getClubById(event.clubId);
  
  if (!club) {
    // Club not found - treat as NOT FOUND to prevent existence leakage
    log.warn("Club not found for event visibility check", { 
      eventId: event.id, 
      clubId: event.clubId 
    });
    return {
      canView: false,
      reason: 'club_not_found',
      message: 'Событие не найдено',
      hideExistence: true,
    };
  }
  
  // 2. Resolve viewer's club role
  let viewerRole: 'owner' | 'admin' | 'member' | 'pending' | null = null;
  
  if (currentUser) {
    const membership = await getMember(event.clubId, currentUser.id);
    viewerRole = membership?.role ?? null;
  }
  
  // 3. SSOT §4.5: Club member (owner/admin/member) sees ALL club events
  // Return null to indicate full access via club membership
  if (viewerRole === 'owner' || viewerRole === 'admin' || viewerRole === 'member') {
    return null; // Signal: skip to personal visibility (which will allow)
  }
  
  // 4. Non-member (guest, pending, or no membership)
  // SSOT §4.5: pending is treated as non-member
  
  // 4a. Private club + non-member = NO events (404)
  if (club.visibility === 'private') {
    return {
      canView: false,
      reason: 'private_club_non_member',
      message: 'Событие не найдено',
      hideExistence: true,
    };
  }
  
  // 4b. Public club + non-member:
  //     - public events → ALLOW
  //     - non-public events → DENY (404)
  if (event.visibility === 'public') {
    return { canView: true };
  }
  
  // Non-public event in public club for non-member → 404
  return {
    canView: false,
    reason: 'not_club_member',
    message: 'Событие не найдено',
    hideExistence: true,
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
 * - clubId !== null → false (club events never fully public, even if visibility=public)
 * 
 * SSOT §1.2: clubId is source of truth for club membership (NOT isClubEvent)
 * 
 * @param event Event to check
 * @returns true if event is publicly visible to all users
 */
export function isPubliclyVisible(event: Event): boolean {
  // SSOT §1.2: clubId is source of truth (NOT isClubEvent)
  // Club events are never fully public, even if visibility=public
  // Using !event.clubId to handle both null and undefined
  return event.visibility === "public" && !event.clubId;
}

/**
 * Check if event should be visible on homepage
 * 
 * Homepage is a public showcase of events for all users (including new visitors).
 * 
 * Rules:
 * - Public events → visible to everyone (including anonymous)
 * - Owner's own events → visible (including unlisted/restricted)
 * - Participants' events → NOT visible (homepage is public showcase, not personal list)
 * 
 * Personal events (including unlisted where user is participant) are shown in /events page.
 * 
 * @param event Event to check
 * @param currentUser Current user (or null if anonymous)
 * @returns true if event should appear on homepage
 */
export function isVisibleOnHomepage(
  event: Event,
  currentUser: CurrentUser | null
): boolean {
  // 1. Public events visible to everyone
  if (isPubliclyVisible(event)) {
    return true;
  }
  
  // 2. Owner sees their own events (including unlisted/restricted)
  if (currentUser && event.createdByUserId === currentUser.id) {
    return true;
  }
  
  // 3. Participants do NOT see unlisted/restricted events on homepage
  // Homepage = public showcase, not personal list
  // Personal events are shown in /events page
  return false;
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
 * Throws appropriate error if user cannot view the event:
 * - NotFoundError (404) for club events to prevent existence leakage
 * - AuthError (403) for personal events
 * 
 * SSOT §4.5: Club event access denial MUST return 404 to prevent
 * existence leakage of private club events.
 * 
 * @param event Event to check
 * @param currentUser Current user (or null if anonymous)
 * @param options Configuration options
 * @throws NotFoundError if user cannot view club event (prevents existence leakage)
 * @throws AuthError if user cannot view personal event
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
    // SSOT §4.5: For club events, return 404 to prevent existence leakage
    if (result.hideExistence) {
      const { NotFoundError } = await import("@/lib/errors");
      throw new NotFoundError(
        result.message || "Событие не найдено"
      );
    }
    
    // For personal events, return 403
    const { AuthError } = await import("@/lib/errors");
    throw new AuthError(
      result.message || "Недостаточно прав для просмотра события",
      undefined,
      403
    );
  }
}
