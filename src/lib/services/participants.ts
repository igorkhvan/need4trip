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
import { AuthError, ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { mapDbEventToDomain, mapDbParticipantToDomain } from "@/lib/mappers";
import { Event, EventCustomFieldValues } from "@/lib/types/event";
import {
  RegisterParticipantPayload,
  participantInputSchema,
  DomainParticipant,
} from "@/lib/types/participant";
import { CurrentUser } from "@/lib/auth/currentUser";
import { z } from "zod";

export async function listParticipants(eventId: string): Promise<DomainParticipant[]> {
  const rows = await listParticipantsRepo(eventId);
  return rows.map(mapDbParticipantToDomain);
}

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
    const hasValue = rawValue !== undefined && rawValue !== null;
    const fieldLabel = field.label || field.id;

    if (field.required && !hasValue) {
      throw new ValidationError(`Поле "${fieldLabel}" обязательно для заполнения`, {
        field: field.id,
        label: fieldLabel,
      });
    }

    if (!hasValue) {
      sanitized[field.id] = null;
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
  currentUser: CurrentUser | null
): Promise<DomainParticipant> {
  const parsed = participantInputSchema.parse(input);
  const dbEvent = await getEventById(eventId);
  if (!dbEvent) {
    throw new NotFoundError("Event not found");
  }
  const event = mapDbEventToDomain(dbEvent);

  if (event.visibility === "link_registered") {
    if (!currentUser) {
      throw new AuthError("Регистрация доступна только авторизованным пользователям", undefined, 401);
    }
    try {
      await upsertEventAccess(event.id, currentUser.id, "link");
    } catch (err) {
      console.error("[registerParticipant] Failed to upsert access for private event", err);
    }
  }

  if (new Date(event.dateTime) <= new Date()) {
    throw new ConflictError("Event already in the past", { code: "EventInPast" });
  }

  if (event.maxParticipants) {
    const currentCount = await countParticipants(eventId);
    if (currentCount >= event.maxParticipants) {
      throw new ConflictError("Регистрация закрыта: достигнут лимит участников", {
        currentCount,
        maxParticipants: event.maxParticipants,
        code: "EventFull",
      });
    }
  }

  const resolvedUserId = currentUser?.id ?? null;

  if (resolvedUserId) {
    await ensureUserExists(resolvedUserId, currentUser?.name ?? undefined);
    const existingByUser = await findParticipantByUser(eventId, resolvedUserId);
    if (existingByUser) {
      throw new ConflictError("User already registered for this event", {
        code: "DuplicateRegistration",
      });
    }
  } else {
    const existingByName = await findParticipantByDisplayName(
      eventId,
      parsed.displayName
    );
    if (existingByName) {
      throw new ConflictError("Display name already registered for this event", {
        code: "DuplicateRegistration",
      });
    }
  }

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
    displayName: parsed.displayName,
    role: parsed.role,
    customFieldValues: sanitizedCustomValues,
  };

  const dbParticipant = await registerParticipantRepo(payload);
  return mapDbParticipantToDomain(dbParticipant);
}

export async function changeParticipantRole(
  id: string,
  role: RegisterParticipantPayload["role"]
) {
  return updateParticipantRole(id, role);
}

const participantUpdateSchema = z.object({
  role: participantRoleSchema.optional(),
  customFieldValues: z.record(z.any()).optional(),
});

export async function updateParticipant(
  participantId: string,
  input: unknown,
  currentUser: CurrentUser | null
): Promise<DomainParticipant> {
  if (!currentUser) {
    throw new AuthError("Необходимо авторизоваться для изменения регистрации", undefined, 401);
  }
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

  if (!participant.userId || participant.userId !== currentUser.id) {
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

  const updatePayload: { customFieldValues: EventCustomFieldValues; role?: ParticipantRole } = {
    customFieldValues: sanitizedCustomValues,
  };

  if (parsed.role) {
    updatePayload.role = parsed.role;
  }

  const updated = await updateParticipantRepo(participantId, updatePayload);

  if (!updated) {
    throw new NotFoundError("Participant not found");
  }

  return mapDbParticipantToDomain(updated);
}

export async function deleteParticipant(
  participantId: string,
  currentUser: CurrentUser | null
): Promise<boolean> {
  if (!currentUser) {
    throw new AuthError("Необходимо авторизоваться для удаления регистрации", undefined, 401);
  }
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

  const isOwner = event.createdByUserId === currentUser.id;
  const isSelf =
    participant.userId !== null &&
    participant.userId !== undefined &&
    participant.userId === currentUser.id;

  if (!isOwner && !isSelf) {
    throw new AuthError("Недостаточно прав для удаления регистрации", undefined, 403);
  }

  const deleted = await deleteParticipantRepo(participantId);
  if (!deleted) {
    throw new NotFoundError("Participant not found");
  }
  return true;
}
