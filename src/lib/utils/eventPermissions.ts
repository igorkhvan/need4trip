/**
 * Event Permissions Utility
 * 
 * Centralized logic for event registration eligibility checks.
 * Single source of truth for all registration rules.
 * 
 * Used by:
 * - API endpoints (registerParticipant)
 * - UI components (event page, forms)
 * - Server actions
 */

import { Event } from "@/lib/types/event";
import { CurrentUser } from "@/lib/auth/currentUser";
import { countParticipants } from "@/lib/db/participantRepo";
import { isClubMember } from "@/lib/db/clubMemberRepo";

export type RegistrationBlockReason =
  | 'past_event'
  | 'limit_reached'
  | 'manually_closed'
  | 'anonymous_not_allowed'
  | 'club_members_only'
  | 'already_registered';

export type RegistrationClosedReason = 
  | 'past_event'
  | 'manually_closed'
  | 'limit_reached'
  | null;

export interface RegistrationEligibility {
  canRegister: boolean;
  reason?: RegistrationBlockReason;
  message?: string;
}

/**
 * Check if a user/guest can register for an event
 * 
 * Order of checks (fail-fast pattern):
 * 1. Owner bypass (owner can always register, even if manually closed)
 * 2. Manual closure check
 * 3. Past event check
 * 4. Participant limit check
 * 5. Anonymous registration check
 * 6. Club membership check (for club events)
 * 7. Duplicate registration check
 * 
 * @returns RegistrationEligibility with canRegister flag and optional reason/message
 */
export async function canRegisterForEvent(
  event: Event,
  currentUser: CurrentUser | null,
  guestSessionId: string | null,
  eventId: string
): Promise<RegistrationEligibility> {
  // 1. Owner can always register (bypass all checks except duplicate)
  const isOwner = currentUser?.id === event.createdByUserId;
  
  // 2. Check manually closed (owner bypass)
  if (event.registrationManuallyClosed && !isOwner) {
    return {
      canRegister: false,
      reason: 'manually_closed',
      message: 'Регистрация закрыта организатором'
    };
  }
  
  // 3. Check date (past event)
  if (new Date(event.dateTime) <= new Date()) {
    return {
      canRegister: false,
      reason: 'past_event',
      message: 'Событие уже прошло'
    };
  }
  
  // 4. Check participant limit
  if (event.maxParticipants) {
    const count = await countParticipants(eventId);
    if (count >= event.maxParticipants) {
      return {
        canRegister: false,
        reason: 'limit_reached',
        message: 'Достигнут лимит участников'
      };
    }
  }
  
  // 5. Check anonymous registration
  if (!currentUser && !event.allowAnonymousRegistration) {
    return {
      canRegister: false,
      reason: 'anonymous_not_allowed',
      message: 'Требуется авторизация через Telegram'
    };
  }
  
  // 6. Check club membership (for club events)
  if (event.isClubEvent && event.clubId) {
    if (!currentUser) {
      return {
        canRegister: false,
        reason: 'club_members_only',
        message: 'Регистрация только для членов клуба'
      };
    }
    
    // Check if user is club member
    const isMember = await isClubMember(event.clubId, currentUser.id);
    
    if (!isMember && !isOwner) {
      return {
        canRegister: false,
        reason: 'club_members_only',
        message: 'Регистрация только для членов клуба'
      };
    }
  }
  
  // ✅ REMOVED: Duplicate registration check
  // Database has UNIQUE constraint on (event_id, user_id) for authenticated users
  // and (event_id, guest_session_id, display_name) for guests.
  // The INSERT operation will fail atomically if duplicate exists.
  // This eliminates race condition and reduces database queries.
  // See: supabase/migrations/20241222_add_user_registration_unique.sql
  
  return { canRegister: true };
}

/**
 * Check if registration is closed (for UI display)
 * 
 * Registration is considered closed if:
 * - Event is in the past
 * - Participant limit reached
 * - Owner manually closed registration (unless current user is owner)
 * 
 * @returns true if registration should appear closed to the user
 */
export function isRegistrationClosed(
  event: Event,
  currentUser: CurrentUser | null,
  participantsCount?: number
): boolean {
  // Owner sees registration as open even if manually closed
  const isOwner = currentUser?.id === event.createdByUserId;
  
  // Past event (PRIORITY 1 - prevails over all)
  if (new Date(event.dateTime) <= new Date()) {
    return true;
  }
  
  // Manually closed (PRIORITY 2 - owner bypass)
  if (event.registrationManuallyClosed && !isOwner) {
    return true;
  }
  
  // Limit reached (PRIORITY 3)
  if (event.maxParticipants && participantsCount !== undefined) {
    return participantsCount >= event.maxParticipants;
  }
  
  return false;
}

/**
 * Get the reason why registration is closed
 * 
 * Priority order (first match wins):
 * 1. Past event
 * 2. Manually closed
 * 3. Limit reached
 * 
 * @returns RegistrationClosedReason or null if open
 */
export function getRegistrationClosedReason(
  event: Event,
  currentUser: CurrentUser | null,
  participantsCount?: number
): RegistrationClosedReason {
  const isOwner = currentUser?.id === event.createdByUserId;
  
  // PRIORITY 1: Past event (prevails over all)
  if (new Date(event.dateTime) <= new Date()) {
    return 'past_event';
  }
  
  // PRIORITY 2: Manually closed (owner bypass)
  if (event.registrationManuallyClosed && !isOwner) {
    return 'manually_closed';
  }
  
  // PRIORITY 3: Limit reached
  if (event.maxParticipants && participantsCount !== undefined) {
    if (participantsCount >= event.maxParticipants) {
      return 'limit_reached';
    }
  }
  
  return null;
}
