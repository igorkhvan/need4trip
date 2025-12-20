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
import { findParticipantByUser, findParticipantByGuestSession } from "@/lib/db/participantRepo";
import { isClubMember } from "@/lib/db/clubMemberRepo";

export type RegistrationBlockReason =
  | 'past_event'
  | 'limit_reached'
  | 'manually_closed'
  | 'anonymous_not_allowed'
  | 'club_members_only'
  | 'already_registered';

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
  
  // 7. Check duplicate registration
  if (currentUser) {
    const existing = await findParticipantByUser(eventId, currentUser.id);
    if (existing) {
      return {
        canRegister: false,
        reason: 'already_registered',
        message: 'Вы уже зарегистрированы на это событие'
      };
    }
  } else if (guestSessionId) {
    const existing = await findParticipantByGuestSession(eventId, guestSessionId);
    if (existing) {
      return {
        canRegister: false,
        reason: 'already_registered',
        message: 'Вы уже зарегистрированы на это событие'
      };
    }
  }
  
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
  
  // Past event
  if (new Date(event.dateTime) <= new Date()) {
    return true;
  }
  
  // Manually closed (owner bypass)
  if (event.registrationManuallyClosed && !isOwner) {
    return true;
  }
  
  // Limit reached
  if (event.maxParticipants && participantsCount !== undefined) {
    return participantsCount >= event.maxParticipants;
  }
  
  return false;
}
