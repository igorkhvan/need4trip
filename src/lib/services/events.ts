import {
  createEvent as createEventRecord,
  deleteEvent as deleteEventRecord,
  getEventById,
  listEvents as listEventsFromRepo,
  updateEvent as updateEventRecord,
} from "@/lib/db/eventRepo";
import { countParticipants, listParticipants } from "@/lib/db/participantRepo";
import { ensureUserExists } from "@/lib/db/userRepo";
import { mapDbEventToDomain, mapDbParticipantToDomain } from "@/lib/mappers";
import {
  EventUpdateInput,
  eventCreateSchema,
  eventUpdateSchema,
  Event,
} from "@/lib/types/event";
import { DomainParticipant } from "@/lib/types/participant";
import { AuthError, ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { CurrentUser } from "@/lib/auth/currentUser";

export async function listEvents(): Promise<Event[]> {
  const events = await listEventsFromRepo();
  return events.map(mapDbEventToDomain);
}

export async function getEvent(id: string): Promise<Event> {
  const dbEvent = await getEventById(id);
  if (!dbEvent) {
    throw new NotFoundError("Event not found");
  }
  return mapDbEventToDomain(dbEvent);
}

export async function getEventWithParticipants(
  id: string
): Promise<{ event: Event | null; participants: DomainParticipant[] }> {
  const dbEvent = await getEventById(id);
  if (!dbEvent) return { event: null, participants: [] };
  const participants = await listParticipants(dbEvent.id);
  return {
    event: mapDbEventToDomain(dbEvent),
    participants: participants.map(mapDbParticipantToDomain),
  };
}

export async function createEvent(input: unknown, currentUser: CurrentUser | null) {
  if (!currentUser) {
    throw new AuthError("Авторизация обязательна для создания ивента", undefined, 401);
  }
  const parsed = eventCreateSchema.parse(input);
  await ensureUserExists(currentUser.id, currentUser.name ?? undefined);
  const db = await createEventRecord({
    ...parsed,
    createdByUserId: currentUser.id,
  });
  return mapDbEventToDomain(db);
}

function areCustomFieldsEqual(
  a: Event["customFieldsSchema"] | undefined,
  b: Event["customFieldsSchema"] | undefined
): boolean {
  return JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
}

export async function updateEvent(
  id: string,
  input: unknown,
  currentUser: CurrentUser | null
) {
  if (!currentUser) {
    throw new AuthError("Авторизация обязательна для изменения ивента", undefined, 401);
  }
  const parsed = eventUpdateSchema.parse(input);
  const existing = await getEventById(id);
  if (!existing) {
    throw new NotFoundError("Event not found");
  }
  if (existing.created_by_user_id !== currentUser.id) {
    throw new AuthError("Недостаточно прав для изменения ивента", undefined, 403);
  }

  const participantsCount = await countParticipants(id);

  if (parsed.maxParticipants !== undefined && parsed.maxParticipants !== null) {
    if (parsed.maxParticipants < participantsCount) {
      throw new ConflictError("maxParticipants is below current registered users", {
        currentCount: participantsCount,
      });
    }
  }

  if (participantsCount > 0 && parsed.customFieldsSchema !== undefined) {
    const sameSchema = areCustomFieldsEqual(
      parsed.customFieldsSchema,
      existing.custom_fields_schema
    );
    if (!sameSchema) {
      throw new ValidationError(
        "Нельзя изменять схему кастомных полей — есть зарегистрированные участники"
      );
    }
  }

  const eventHasPassed = new Date(existing.date_time) < new Date();
  const patch: EventUpdateInput = {
    ...parsed,
    dateTime:
      eventHasPassed && parsed.dateTime
        ? undefined
        : parsed.dateTime instanceof Date
          ? parsed.dateTime.toISOString()
          : parsed.dateTime,
  };

  const updated = await updateEventRecord(id, patch);
  if (!updated) {
    throw new NotFoundError("Event not found");
  }
  return mapDbEventToDomain(updated);
}

export async function deleteEvent(id: string, currentUser: CurrentUser | null): Promise<boolean> {
  if (!currentUser) {
    throw new AuthError("Авторизация обязательна для удаления ивента", undefined, 401);
  }
  const existing = await getEventById(id);
  if (!existing) {
    throw new NotFoundError("Event not found");
  }
  if (existing.created_by_user_id !== currentUser.id) {
    throw new AuthError("Недостаточно прав для удаления ивента", undefined, 403);
  }
  return deleteEventRecord(id);
}
