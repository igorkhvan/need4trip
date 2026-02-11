import {
  countParticipants,
  countParticipantsByRole,
  findParticipantByDisplayName,
  findParticipantByUser,
  findParticipantById,
  listParticipants as listParticipantsRepo,
  registerParticipant as registerParticipantRepo,
  updateParticipant as updateParticipantRepo,
  updateParticipantRole,
  deleteParticipant as deleteParticipantRepo,
} from "@/lib/db/participantRepo";
import { getEventById } from "@/lib/db/eventRepo";
import { ensureUserExists } from "@/lib/db/userRepo";
import { upsertEventAccess } from "@/lib/db/eventAccessRepo";
import { AuthError, ConflictError, NotFoundError, ValidationError, isUniqueViolationError } from "@/lib/errors";
import { mapDbEventToDomain, mapDbParticipantToDomain } from "@/lib/mappers";
import { Event, EventCustomFieldValues } from "@/lib/types/event";
import { log } from "@/lib/utils/logger";
import {
  RegisterParticipantPayload,
  participantInputSchema,
  participantRoleSchema,
  ParticipantRole,
  DomainParticipant,
} from "@/lib/types/participant";
import { CurrentUser } from "@/lib/auth/currentUser";
import { z } from "zod";


function validateCustomFieldValues(
  event: Event,
  values: EventCustomFieldValues
): EventCustomFieldValues {
  const schema = event.customFieldsSchema || [];
  const allowedIds = new Set(schema.map((f) => f.id));

  Object.keys(values).forEach((key) => {
    if (!allowedIds.has(key)) {
      throw new ValidationError(`Незапланированное поле: ${key}`, { field: key });
    }
  });

  const sanitized: EventCustomFieldValues = {};

  for (const field of schema) {
    const rawValue = values[field.id];
    // Для boolean полей false - это валидное значение (означает "Нет")
    const hasValue = field.type === "boolean" 
      ? (rawValue !== undefined && rawValue !== null)
      : (rawValue !== undefined && rawValue !== null);
    const fieldLabel = field.label || field.id;

    if (field.required && !hasValue) {
      throw new ValidationError(`Поле "${fieldLabel}" обязательно для заполнения`, {
        field: field.id,
        label: fieldLabel,
      });
    }

    if (!hasValue) {
      // Для boolean полей: если значение не передано, устанавливаем false (не null)
      sanitized[field.id] = field.type === "boolean" ? false : null;
      continue;
    }

    const fail = (message: string) =>
      new ValidationError(`${message}: "${fieldLabel}"`, {
        field: field.id,
        label: fieldLabel,
      });

    switch (field.type) {
      case "boolean":
        if (typeof rawValue !== "boolean") {
          throw fail("Expected boolean value");
        }
        sanitized[field.id] = rawValue;
        break;
      case "text": {
        if (typeof rawValue !== "string") throw fail("Expected string value");
        const trimmed = rawValue.trim();
        if (field.required && trimmed.length === 0) {
          throw fail("Text value is required");
        }
        if (trimmed.length > 1000) {
          throw fail("Text value is too long");
        }
        sanitized[field.id] = trimmed;
        break;
      }
      case "number": {
        const num =
          typeof rawValue === "number" ? rawValue : Number(String(rawValue));
        if (!Number.isFinite(num)) {
          throw fail("Expected numeric value");
        }
        if (field.required && num < 1) {
          throw fail("Число должно быть 1 или больше");
        }
        sanitized[field.id] = num;
        break;
      }
      case "enum": {
        if (typeof rawValue !== "string") {
          throw fail("Expected string for enum value");
        }
        if (!field.options?.includes(rawValue)) {
          throw fail("Value must be one of enum options");
        }
        sanitized[field.id] = rawValue;
        break;
      }
      default:
        throw fail("Unsupported field type");
    }
  }

  return sanitized;
}

export async function registerParticipant(
  eventId: string,
  input: unknown,
  currentUser: CurrentUser | null,
  guestSessionId?: string | null
): Promise<DomainParticipant> {
  const parsed = participantInputSchema.parse(input);
  const dbEvent = await getEventById(eventId);
  if (!dbEvent) {
    throw new NotFoundError("Event not found");
  }
  const event = mapDbEventToDomain(dbEvent);

  // ✅ USE CENTRALIZED PERMISSION LOGIC
  const { canRegisterForEvent } = await import("@/lib/utils/eventPermissions");
  const eligibility = await canRegisterForEvent(
    event,
    currentUser,
    guestSessionId ?? null,
    eventId
  );

  if (!eligibility.canRegister) {
    throw new ConflictError(eligibility.message || 'Регистрация недоступна', {
      code: eligibility.reason,
    });
  }

  // 🔒 BILLING ENFORCEMENT: Check club subscription limits for club events
  // This prevents clubs from exceeding their plan's participant limit
  // SSOT: docs/BILLING_SYSTEM_ANALYSIS.md - enforceClubAction checks eventParticipantsCount
  if (event.clubId) {
    const currentCount = await countParticipants(eventId);
    const { enforceClubAction } = await import("@/lib/services/accessControl");
    
    await enforceClubAction({
      clubId: event.clubId,
      action: "CLUB_CREATE_EVENT", // Reuse existing action - checks eventParticipantsCount
      context: {
        eventParticipantsCount: currentCount + 1, // Check current + new participant
        isPaidEvent: event.isPaid,
      },
    });
  }

  // ✅ For 'restricted' visibility, grant access automatically when user registers
  // Uses centralized upsertEventAccess from eventAccessRepo
  if (event.visibility === "restricted" && currentUser) {
    try {
      await upsertEventAccess(event.id, currentUser.id, "participant");
      log.info("Auto-granted access for restricted event on registration", { 
        eventId: event.id, 
        userId: currentUser.id 
      });
    } catch (err) {
      log.errorWithStack("Failed to grant access for restricted event on registration", err, { 
        eventId: event.id 
      });
    }
  }

  const resolvedUserId = currentUser?.id ?? null;
  const resolvedGuestSessionId = resolvedUserId ? null : (guestSessionId ?? null);

  // Ensure user exists in database
  if (resolvedUserId) {
    await ensureUserExists(resolvedUserId, currentUser?.name ?? undefined);
  }

  // Check if leader/tail role is available
  if (parsed.role === "leader" || parsed.role === "tail") {
    const roleCount = await countParticipantsByRole(eventId, parsed.role);
    if (roleCount > 0) {
      throw new ConflictError(`Role ${parsed.role} already taken`, {
        role: parsed.role,
        code: "RoleTaken",
      });
    }
  }

  const sanitizedCustomValues = validateCustomFieldValues(
    event,
    (parsed.customFieldValues ?? {}) as EventCustomFieldValues
  );

  const payload: RegisterParticipantPayload = {
    eventId,
    userId: resolvedUserId,
    guestSessionId: resolvedGuestSessionId,
    displayName: parsed.displayName,
    role: parsed.role,
    customFieldValues: sanitizedCustomValues,
  };

  // ✅ OPTIMISTIC INSERT: Try to insert, let DB enforce uniqueness
  // DB has UNIQUE constraint on (event_id, user_id) for authenticated users
  // and (event_id, guest_session_id, display_name) for guests
  let dbParticipant;
  try {
    dbParticipant = await registerParticipantRepo(payload);
  } catch (err) {
    // Handle unique constraint violation from database
    if (isUniqueViolationError(err)) {
      throw new ConflictError('Вы уже зарегистрированы на это событие', {
        code: 'already_registered',
      });
    }
    throw err;
  }
  
  const participant = mapDbParticipantToDomain(dbParticipant);
  
  // Queue notification to event organizer (non-blocking)
  queueNewParticipantNotificationAsync(event, participant, payload.displayName).catch((err) => {
    log.error("[registerParticipant] Failed to queue organizer notification", { error: err });
  });
  
  return participant;
}

/**
 * Queue notification to event organizer about new participant (non-blocking)
 */
async function queueNewParticipantNotificationAsync(
  event: Event,
  participant: DomainParticipant,
  displayName: string
): Promise<void> {
  try {
    if (!event.createdByUserId) {
      log.warn("[queueNewParticipantNotification] Event has no createdByUserId", { eventId: event.id });
      return;
    }
    
    const { getUserById } = await import("@/lib/db/userRepo");
    const { countParticipants } = await import("@/lib/db/participantRepo");
    const { queueNewParticipantNotification } = await import("@/lib/services/notifications");
    
    // Get organizer info
    const organizer = await getUserById(event.createdByUserId);
    if (!organizer || !organizer.telegramId) {
      log.warn("[queueNewParticipantNotification] Organizer has no telegramId", {
        organizerId: event.createdByUserId
      });
      return;
    }
    
    // Get current participant count
    const totalParticipants = await countParticipants(event.id);
    
    await queueNewParticipantNotification({
      eventId: event.id,
      eventSlug: event.slug,
      eventTitle: event.title,
      organizerId: organizer.id,
      organizerTelegramId: organizer.telegramId,
      participantName: displayName,
      registrationId: participant.id,
      totalParticipants,
      maxParticipants: event.maxParticipants,
    });
  } catch (err) {
    log.error("[queueNewParticipantNotificationAsync] Unexpected error", { error: err });
    throw err;
  }
}

export async function changeParticipantRole(
  id: string,
  role: RegisterParticipantPayload["role"]
) {
  return updateParticipantRole(id, role);
}

const participantUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(100).optional(),
  role: participantRoleSchema.optional(),
  customFieldValues: z.record(z.any()).optional(),
});

export async function updateParticipant(
  participantId: string,
  input: unknown,
  currentUser: CurrentUser | null,
  guestSessionId?: string | null
): Promise<DomainParticipant> {
  const parsed = participantUpdateSchema.parse(input);
  const dbParticipant = await findParticipantById(participantId);
  if (!dbParticipant) {
    throw new NotFoundError("Participant not found");
  }
  const dbEvent = await getEventById(dbParticipant.event_id);
  if (!dbEvent) {
    throw new NotFoundError("Event not found");
  }

  const event = mapDbEventToDomain(dbEvent);
  const participant = mapDbParticipantToDomain(dbParticipant);
  const isOwner = currentUser?.id === event.createdByUserId;

  // Check permissions: owner OR authenticated user editing own record OR guest editing own record
  const canEdit =
    isOwner ||
    (currentUser && participant.userId && participant.userId === currentUser.id) ||
    (!currentUser && guestSessionId && participant.guestSessionId && participant.guestSessionId === guestSessionId);

  if (!canEdit) {
    throw new AuthError("Недостаточно прав для изменения регистрации", undefined, 403);
  }

  // Валидация роли, если она изменяется
  if (parsed.role && parsed.role !== participant.role) {
    if (parsed.role === "leader" || parsed.role === "tail") {
      const roleCount = await countParticipantsByRole(dbEvent.id, parsed.role);
      // roleCount должен быть 0, либо 1 если это текущий участник с этой ролью
      if (roleCount > 0 && participant.role !== parsed.role) {
        throw new ConflictError(`Роль ${parsed.role === "leader" ? "Лидер" : "Замыкающий"} уже занята`, {
          role: parsed.role,
          code: "RoleTaken",
        });
      }
    }
  }

  const mergedCustomValues = parsed.customFieldValues
    ? { ...(participant.customFieldValues ?? {}), ...parsed.customFieldValues }
    : participant.customFieldValues ?? {};
  const sanitizedCustomValues = validateCustomFieldValues(event, mergedCustomValues);

  const updatePayload: { customFieldValues: EventCustomFieldValues; role?: ParticipantRole; displayName?: string } = {
    customFieldValues: sanitizedCustomValues,
  };

  if (parsed.role) {
    updatePayload.role = parsed.role;
  }

  if (parsed.displayName) {
    updatePayload.displayName = parsed.displayName;
  }

  const updated = await updateParticipantRepo(participantId, updatePayload);

  if (!updated) {
    throw new NotFoundError("Participant not found");
  }

  return mapDbParticipantToDomain(updated);
}

export async function deleteParticipant(
  participantId: string,
  currentUser: CurrentUser | null,
  guestSessionId?: string | null
): Promise<boolean> {
  const dbParticipant = await findParticipantById(participantId);
  if (!dbParticipant) {
    throw new NotFoundError("Participant not found");
  }
  const dbEvent = await getEventById(dbParticipant.event_id);
  if (!dbEvent) {
    throw new NotFoundError("Event not found");
  }
  const event = mapDbEventToDomain(dbEvent);
  const participant = mapDbParticipantToDomain(dbParticipant);

  const isOwner = currentUser?.id === event.createdByUserId;
  
  // ✅ FIXED: Check guestSessionId REGARDLESS of currentUser
  // This allows guests who later logged in to still delete themselves
  const isSelf =
    // Authenticated user owns the participant record
    (currentUser && participant.userId && participant.userId === currentUser.id) ||
    // OR: Guest session matches (works ALWAYS, even after login!)
    (guestSessionId && participant.guestSessionId && participant.guestSessionId === guestSessionId);

  if (!isOwner && !isSelf) {
    throw new AuthError("Недостаточно прав для удаления регистрации", undefined, 403);
  }

  const deleted = await deleteParticipantRepo(participantId);
  if (!deleted) {
    throw new NotFoundError("Participant not found");
  }
  return true;
}
