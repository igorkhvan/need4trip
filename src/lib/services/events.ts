import {
  createEvent as createEventRecord,
  deleteEvent as deleteEventRecord,
  getEventById,
  listEvents as listEventsFromRepo,
  updateEvent as updateEventRecord,
  replaceAllowedBrands,
  getAllowedBrands,
} from "@/lib/db/eventRepo";
import {
  countParticipants,
  listParticipants,
  listEventIdsForUser,
  listParticipantEventIds,
} from "@/lib/db/participantRepo";
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
import { upsertEventAccess, listAccessibleEventIds } from "@/lib/db/eventAccessRepo";

type EventAccessOptions = {
  currentUser?: CurrentUser | null;
  enforceVisibility?: boolean;
};

async function ensureEventVisibility(event: Event, opts?: EventAccessOptions) {
  const enforce = opts?.enforceVisibility ?? false;
  if (!enforce) return;
  if (event.visibility === "public") return;

  const currentUser = opts?.currentUser ?? null;
  if (!currentUser) {
    throw new AuthError("Недостаточно прав для просмотра события", undefined, 403);
  }
  if (event.createdByUserId === currentUser.id) return;

  let allowed = false;
  try {
    const [participantEventIds, accessEventIds] = await Promise.all([
      listEventIdsForUser(currentUser.id),
      listAccessibleEventIds(currentUser.id),
    ]);
    const allowedIds = new Set<string>([...participantEventIds, ...accessEventIds]);
    allowed = allowedIds.has(event.id);
  } catch (err) {
    console.error("[ensureEventVisibility] Failed to check access", err);
  }

  if (!allowed && event.visibility === "link_registered") {
    try {
      await upsertEventAccess(event.id, currentUser.id, "link");
      allowed = true;
    } catch (err) {
      console.error("[ensureEventVisibility] Failed to upsert access for link", err);
    }
  }

  if (!allowed) {
    throw new AuthError("Недостаточно прав для просмотра события", undefined, 403);
  }
}

export async function listEvents(): Promise<Event[]> {
  const events = await listEventsFromRepo();
  return events.map(mapDbEventToDomain);
}

export async function listEventsSafe(): Promise<Event[]> {
  try {
    const events = await listEventsFromRepo();
    return events.map(mapDbEventToDomain);
  } catch (err) {
    console.error("[listEventsSafe] Failed to list events", err);
    return [];
  }
}

export async function listVisibleEventsForUser(userId: string | null): Promise<Event[]> {
  const events = await listEventsSafe();
  const filtered = await (async () => {
    if (!userId) {
      return events.filter((e) => e.visibility === "public");
    }
    let participantEventIds: string[] = [];
    let accessEventIds: string[] = [];
    try {
      participantEventIds = await listEventIdsForUser(userId);
    } catch (err) {
      console.error("[listVisibleEventsForUser] Failed to load participant events", err);
    }
    try {
      accessEventIds = await listAccessibleEventIds(userId);
    } catch (err) {
      console.error("[listVisibleEventsForUser] Failed to load access events", err);
    }
    const allowedIds = new Set([...participantEventIds, ...accessEventIds]);
    return events.filter(
      (e) => e.visibility === "public" || e.createdByUserId === userId || allowedIds.has(e.id)
    );
  })();

  const eventIds = filtered.map((e) => e.id);
  let counts: Record<string, number> = {};
  try {
    const participantEventIdsAll = await listParticipantEventIds(eventIds);
    counts = participantEventIdsAll.reduce<Record<string, number>>((acc, eventId) => {
      acc[eventId] = (acc[eventId] ?? 0) + 1;
      return acc;
    }, {});
  } catch (err) {
    console.error("[listVisibleEventsForUser] Failed to count participants for events", err);
  }

  const hydrated = await Promise.all(
    filtered.map(async (event) => {
      let allowedBrands = event.allowedBrands;
      try {
        allowedBrands = await getAllowedBrands(event.id);
      } catch (err) {
        console.error("[listVisibleEventsForUser] Failed to load allowed brands for event", err);
      }
      return {
        ...event,
        allowedBrands,
        participantsCount: counts[event.id] ?? 0,
      };
    })
  );

  return hydrated;
}

export async function grantEventAccessByLink(eventId: string, userId: string): Promise<void> {
  try {
    await upsertEventAccess(eventId, userId, "link");
  } catch (err) {
    console.error("[grantEventAccessByLink] Failed to upsert access", err);
  }
}

export async function getEvent(id: string): Promise<Event> {
  const dbEvent = await getEventById(id);
  if (!dbEvent) {
    throw new NotFoundError("Event not found");
  }
  const event = mapDbEventToDomain(dbEvent);
  try {
    event.allowedBrands = await getAllowedBrands(id);
  } catch (err) {
    console.error("[getEvent] Failed to load allowed brands", err);
  }
  return event;
}

export async function getEventWithVisibility(
  id: string,
  options?: EventAccessOptions
): Promise<Event> {
  const event = await getEvent(id);
  await ensureEventVisibility(event, options);
  return event;
}

export async function getEventWithParticipants(
  id: string
): Promise<{ event: Event | null; participants: DomainParticipant[] }> {
  const dbEvent = await getEventById(id);
  if (!dbEvent) return { event: null, participants: [] };
  const participants = await listParticipants(dbEvent.id);
  const event = mapDbEventToDomain(dbEvent);
  try {
    event.allowedBrands = await getAllowedBrands(id);
  } catch (err) {
    console.error("[getEventWithParticipants] Failed to load allowed brands", err);
  }
  return {
    event,
    participants: participants.map(mapDbParticipantToDomain),
  };
}

export async function getEventWithParticipantsVisibility(
  id: string,
  options?: EventAccessOptions
): Promise<{ event: Event | null; participants: DomainParticipant[] }> {
  const dbEvent = await getEventById(id);
  if (!dbEvent) return { event: null, participants: [] };
  const participants = await listParticipants(dbEvent.id);
  const event = mapDbEventToDomain(dbEvent);
  try {
    event.allowedBrands = await getAllowedBrands(id);
  } catch (err) {
    console.error("[getEventWithParticipants] Failed to load allowed brands", err);
  }
  await ensureEventVisibility(event, options);
  return {
    event,
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
  if (parsed.allowedBrandIds?.length) {
    await replaceAllowedBrands(db.id, parsed.allowedBrandIds);
  }
  await upsertEventAccess(db.id, currentUser.id, "owner");
  const event = mapDbEventToDomain(db);
  try {
    event.allowedBrands = await getAllowedBrands(db.id);
  } catch (err) {
    console.error("[createEvent] Failed to load allowed brands", err);
  }
  return event;
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
          ? parsed.dateTime
          : parsed.dateTime
            ? new Date(parsed.dateTime)
            : undefined,
  };

  const updated = await updateEventRecord(id, patch);
  if (!updated) {
    throw new NotFoundError("Event not found");
  }
  if (parsed.allowedBrandIds) {
    await replaceAllowedBrands(id, parsed.allowedBrandIds);
  }
  const event = mapDbEventToDomain(updated);
  try {
    event.allowedBrands = await getAllowedBrands(id);
  } catch (err) {
    console.error("[updateEvent] Failed to load allowed brands", err);
  }
  return event;
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
