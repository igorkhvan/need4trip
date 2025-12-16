import {
  createEvent as createEventRecord,
  deleteEvent as deleteEventRecord,
  getEventById,
  listEventsWithOwner,
  listPublicEvents,
  listEventsByCreator,
  updateEvent as updateEventRecord,
  replaceAllowedBrands,
  getAllowedBrands,
  getAllowedBrandsByEventIds,
} from "@/lib/db/eventRepo";
import {
  countParticipants,
  listParticipants,
  listEventIdsForUser,
  listParticipantEventIds,
} from "@/lib/db/participantRepo";
import { ensureUserExists } from "@/lib/db/userRepo";
import { hydrateCitiesAndCurrencies } from "@/lib/utils/hydration";
import { hydrateEventCategories } from "@/lib/utils/eventCategoryHydration";
import {
  mapDbEventToDomain,
  mapDbEventWithOwnerToDomain,
  mapDbParticipantToDomain,
} from "@/lib/mappers";
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
import { enforceClubAction } from "@/lib/services/accessControl";

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

  // For 'restricted' visibility, grant access automatically when user visits via link
  if (!allowed && event.visibility === "restricted") {
    try {
      await upsertEventAccess(event.id, currentUser.id, "link");
      allowed = true;
    } catch (err) {
      console.error("[ensureEventVisibility] Failed to upsert access for restricted event", err);
    }
  }

  if (!allowed) {
    throw new AuthError("Недостаточно прав для просмотра события", undefined, 403);
  }
}

export async function listEvents(page = 1, limit = 12): Promise<{
  events: Event[];
  total: number;
  hasMore: boolean;
}> {
  const result = await listEventsWithOwner(page, limit);
  const mapped = result.data.map(mapDbEventWithOwnerToDomain);
  
  return {
    events: mapped,
    total: result.total,
    hasMore: result.hasMore,
  };
}

export async function listEventsSafe(page = 1, limit = 12): Promise<{
  events: Event[];
  total: number;
  hasMore: boolean;
}> {
  try {
    const result = await listEventsWithOwner(page, limit);
    return {
      events: result.data.map(mapDbEventWithOwnerToDomain),
      total: result.total,
      hasMore: result.hasMore,
    };
  } catch (err) {
    console.error("[listEventsSafe] Failed to list events", err);
    return {
      events: [],
      total: 0,
      hasMore: false,
    };
  }
}

export async function listVisibleEventsForUser(userId: string | null): Promise<Event[]> {
  // If no user, load only public events
  if (!userId) {
    const result = await listPublicEvents(1, 100); // Load first 100 public events
    const mapped = result.data.map(mapDbEventWithOwnerToDomain);
    
    const eventIds = mapped.map((e) => e.id);
    const [counts, allowedBrandsMap, eventsWithHydration] = await Promise.all([
      getParticipantsCountByEventIds(eventIds),
      getAllowedBrandsByEventIds(eventIds),
      hydrateCitiesAndCurrencies(mapped),
      hydrateEventCategories(mapped),
    ]);

    return eventsWithHydration.map((event) => ({
      ...event,
      allowedBrands: allowedBrandsMap.get(event.id) ?? [],
      participantsCount: counts[event.id] ?? 0,
    }));
  }

  // For authenticated users, load multiple event types in parallel
  const [publicResult, ownedResult, participantEventIds, accessEventIds] = await Promise.all([
    listPublicEvents(1, 100),
    listEventsByCreator(userId, 1, 100),
    listEventIdsForUser(userId).catch((err) => {
      console.error("[listVisibleEventsForUser] Failed to load participant events", err);
      return [];
    }),
    listAccessibleEventIds(userId).catch((err) => {
      console.error("[listVisibleEventsForUser] Failed to load access events", err);
      return [];
    }),
  ]);

  // Combine public and owned events
  const allEvents = [
    ...publicResult.data.map(mapDbEventWithOwnerToDomain),
    ...ownedResult.data.map(mapDbEventWithOwnerToDomain),
  ];

  // Remove duplicates by ID
  const uniqueEvents = Array.from(
    new Map(allEvents.map((e) => [e.id, e])).values()
  );

  // For non-public events, check if user has access
  const allowedIds = new Set([...participantEventIds, ...accessEventIds]);
  const filtered = uniqueEvents.filter(
    (e) => 
      e.visibility === "public" || 
      e.createdByUserId === userId || 
      allowedIds.has(e.id)
  );

  const eventIds = filtered.map((e) => e.id);
  const [counts, allowedBrandsMap, eventsWithHydration] = await Promise.all([
    getParticipantsCountByEventIds(eventIds),
    getAllowedBrandsByEventIds(eventIds),
    hydrateCitiesAndCurrencies(filtered),
    hydrateEventCategories(filtered),
  ]);

  return eventsWithHydration.map((event) => ({
    ...event,
    allowedBrands: allowedBrandsMap.get(event.id) ?? [],
    participantsCount: counts[event.id] ?? 0,
  }));
}

async function getParticipantsCountByEventIds(eventIds: string[]): Promise<Record<string, number>> {
  if (!eventIds.length) return {};
  let participantEventIdsAll: string[] = [];
  try {
    participantEventIdsAll = await listParticipantEventIds(eventIds);
  } catch (err) {
    console.error("[getParticipantsCountByEventIds] Failed to count participants for events", err);
    return {};
  }
  return participantEventIdsAll.reduce<Record<string, number>>((acc, eventId) => {
    acc[eventId] = (acc[eventId] ?? 0) + 1;
    return acc;
  }, {});
}

export async function hydrateEvent(event: Event): Promise<Event> {
  let allowedBrands = event.allowedBrands;
  try {
    allowedBrands = await getAllowedBrands(event.id);
  } catch (err) {
    console.error("[hydrateEvent] Failed to load allowed brands", err);
  }
  let participantsCount = event.participantsCount ?? 0;
  try {
    participantsCount = await countParticipants(event.id);
  } catch (err) {
    console.error("[hydrateEvent] Failed to count participants", err);
  }
  
  // Hydrate city and currency
  let hydratedEvent = { ...event, allowedBrands, participantsCount };
  try {
    const [hydrated] = await hydrateCitiesAndCurrencies([hydratedEvent]);
    hydratedEvent = hydrated;
  } catch (err) {
    console.error("[hydrateEvent] Failed to hydrate city/currency", err);
  }
  
  // Hydrate category
  try {
    const [hydratedWithCategory] = await hydrateEventCategories([hydratedEvent]);
    hydratedEvent = hydratedWithCategory;
  } catch (err) {
    console.error("[hydrateEvent] Failed to hydrate category", err);
  }
  
  return hydratedEvent;
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

/**
 * Получить базовую информацию о событии (без участников)
 * Для быстрой загрузки с Streaming SSR
 * Включает только счетчик участников (быстрый запрос)
 */
export async function getEventBasicInfo(
  id: string,
  options?: EventAccessOptions
): Promise<(Event & { participantsCount: number }) | null> {
  try {
    console.log('[getEventBasicInfo] Starting for event:', id);
    
    const dbEvent = await getEventById(id);
    if (!dbEvent) {
      console.log('[getEventBasicInfo] Event not found in DB');
      return null;
    }
    
    console.log('[getEventBasicInfo] DB event loaded, mapping to domain');
    let event = mapDbEventToDomain(dbEvent);
    
    // Hydrate all related data + count participants (parallel)
    console.log('[getEventBasicInfo] Loading brands and participants count');
    const [allowedBrands, participantsCount] = await Promise.all([
      getAllowedBrands(id).catch((err) => {
        console.error("[getEventBasicInfo] Failed to load allowed brands", err);
        return [];
      }),
      countParticipants(id),
    ]);
    
    event.allowedBrands = allowedBrands;
    
    // Hydrate city and currency
    console.log('[getEventBasicInfo] Hydrating cities and currencies');
    const [hydratedEvents] = await hydrateCitiesAndCurrencies([event]);
    event = hydratedEvents;
    
    // Hydrate category
    console.log('[getEventBasicInfo] Hydrating category');
    const [eventWithCategory] = await hydrateEventCategories([event]);
    event = eventWithCategory;
    
    console.log('[getEventBasicInfo] Checking visibility');
    await ensureEventVisibility(event, options);
    
    console.log('[getEventBasicInfo] Success!');
    return {
      ...event,
      participantsCount,
    };
  } catch (error) {
    console.error('[getEventBasicInfo] Error:', error);
    throw error;
  }
}

export async function getEventWithParticipantsVisibility(
  id: string,
  options?: EventAccessOptions
): Promise<{ event: Event | null; participants: DomainParticipant[] }> {
  const dbEvent = await getEventById(id);
  if (!dbEvent) return { event: null, participants: [] };
  const participants = await listParticipants(dbEvent.id);
  let event = mapDbEventToDomain(dbEvent);
  
  // Hydrate all related data
  try {
    event.allowedBrands = await getAllowedBrands(id);
  } catch (err) {
    console.error("[getEventWithParticipants] Failed to load allowed brands", err);
  }
  
  // Hydrate city and currency
  const [hydratedEvents] = await hydrateCitiesAndCurrencies([event]);
  event = hydratedEvents;
  
  // Hydrate category
  const [eventWithCategory] = await hydrateEventCategories([event]);
  event = eventWithCategory;
  
  await ensureEventVisibility(event, options);
  return {
    event,
    participants: participants.map(mapDbParticipantToDomain),
  };
}

export async function createEvent(input: unknown, currentUser: CurrentUser | null) {
  if (!currentUser) {
    throw new AuthError("Авторизация обязательна для создания события", undefined, 401);
  }
  const parsed = eventCreateSchema.parse(input);
  
  // ⚡ Billing v2.0 Enforcement
  // Check if club can create event with given parameters
  if (parsed.clubId) {
    await enforceClubAction({
      clubId: parsed.clubId,
      action: parsed.isPaid ? "CLUB_CREATE_PAID_EVENT" : "CLUB_CREATE_EVENT",
      context: {
        eventParticipantsCount: parsed.maxParticipants ?? undefined,
        isPaidEvent: parsed.isPaid,
      },
    });
  } else {
    // Personal events (no club) - enforce FREE plan limits from DB
    const { getPlanById } = await import("@/lib/db/planRepo");
    const { PaywallError } = await import("@/lib/errors");
    
    const freePlan = await getPlanById("free");
    
    // Check paid events limit
    if (parsed.isPaid && !freePlan.allowPaidEvents) {
      throw new PaywallError({
        message: "Платные события доступны только на платных тарифах",
        reason: "PAID_EVENTS_NOT_ALLOWED",
        currentPlanId: "free",
        requiredPlanId: "club_50",
        meta: {
          feature: "Платные события",
        },
      });
    }
    
    // Check participants limit
    if (parsed.maxParticipants && freePlan.maxEventParticipants !== null && 
        parsed.maxParticipants > freePlan.maxEventParticipants) {
      throw new PaywallError({
        message: `Превышен лимит участников (${parsed.maxParticipants} > ${freePlan.maxEventParticipants})`,
        reason: "MAX_EVENT_PARTICIPANTS_EXCEEDED",
        currentPlanId: "free",
        requiredPlanId: "club_50",
        meta: {
          requested: parsed.maxParticipants,
          limit: freePlan.maxEventParticipants,
        },
      });
    }
  }
  
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

/**
 * Проверяет что новая схема не нарушает существующие данные участников.
 * Разрешает: добавление новых полей, изменение label/required/options.
 * Запрещает: удаление полей, изменение типа полей.
 */
function validateCustomFieldsUpdate(
  newSchema: Event["customFieldsSchema"] | undefined,
  existingSchema: Event["customFieldsSchema"] | undefined
): { valid: boolean; error?: string } {
  const existing = existingSchema ?? [];
  const updated = newSchema ?? [];
  
  // Если нет существующих полей - можно делать что угодно
  if (existing.length === 0) {
    return { valid: true };
  }
  
  // Создаем мапы для быстрого доступа
  const existingMap = new Map(existing.map(f => [f.id, f]));
  const updatedMap = new Map(updated.map(f => [f.id, f]));
  
  // Проверяем каждое существующее поле
  for (const [existingId, existingField] of existingMap) {
    const updatedField = updatedMap.get(existingId);
    
    // Проверка 1: Поле не удалено
    if (!updatedField) {
      return {
        valid: false,
        error: `Нельзя удалять поле "${existingField.label || existingId}" - оно используется участниками`
      };
    }
    
    // Проверка 2: Тип поля не изменен
    if (updatedField.type !== existingField.type) {
      return {
        valid: false,
        error: `Нельзя изменять тип поля "${existingField.label || existingId}" (${existingField.type} → ${updatedField.type}) - оно используется участниками`
      };
    }
  }
  
  return { valid: true };
}

export async function updateEvent(
  id: string,
  input: unknown,
  currentUser: CurrentUser | null
) {
  if (!currentUser) {
    throw new AuthError("Авторизация обязательна для изменения события", undefined, 401);
  }
  const parsed = eventUpdateSchema.parse(input);
  const existing = await getEventById(id);
  if (!existing) {
    throw new NotFoundError("Event not found");
  }
  if (existing.created_by_user_id !== currentUser.id) {
    throw new AuthError("Недостаточно прав для изменения события", undefined, 403);
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
    const validation = validateCustomFieldsUpdate(
      parsed.customFieldsSchema,
      existing.custom_fields_schema
    );
    if (!validation.valid) {
      throw new ValidationError(
        validation.error || "Нельзя удалять существующие поля - они используются участниками"
      );
    }
  }

  // ⚡ Billing v2.0 Enforcement for updates
  // Check if changes violate plan limits
  const finalMaxParticipants = parsed.maxParticipants !== undefined 
    ? parsed.maxParticipants 
    : existing.max_participants;
  const finalIsPaid = parsed.isPaid !== undefined 
    ? parsed.isPaid 
    : existing.is_paid;
  
  if (existing.club_id) {
    // Club event - use enforceClubAction
    await enforceClubAction({
      clubId: existing.club_id,
      action: finalIsPaid ? "CLUB_CREATE_PAID_EVENT" : "CLUB_CREATE_EVENT",
      context: {
        eventParticipantsCount: finalMaxParticipants ?? undefined,
        isPaidEvent: finalIsPaid,
      },
    });
  } else {
    // Personal event - enforce FREE plan limits from DB
    const { getPlanById } = await import("@/lib/db/planRepo");
    const { PaywallError } = await import("@/lib/errors");
    
    const freePlan = await getPlanById("free");
    
    if (finalIsPaid && !freePlan.allowPaidEvents) {
      throw new PaywallError({
        message: "Платные события доступны только на платных тарифах",
        reason: "PAID_EVENTS_NOT_ALLOWED",
        currentPlanId: "free",
        requiredPlanId: "club_50",
        meta: {
          feature: "Платные события",
        },
      });
    }
    
    if (finalMaxParticipants && freePlan.maxEventParticipants !== null &&
        finalMaxParticipants > freePlan.maxEventParticipants) {
      throw new PaywallError({
        message: `Превышен лимит участников (${finalMaxParticipants} > ${freePlan.maxEventParticipants})`,
        reason: "MAX_EVENT_PARTICIPANTS_EXCEEDED",
        currentPlanId: "free",
        requiredPlanId: "club_50",
        meta: {
          requested: finalMaxParticipants,
          limit: freePlan.maxEventParticipants,
        },
      });
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
    throw new AuthError("Авторизация обязательна для удаления события", undefined, 401);
  }
  const existing = await getEventById(id);
  if (!existing) {
    throw new NotFoundError("Event not found");
  }
  if (existing.created_by_user_id !== currentUser.id) {
    throw new AuthError("Недостаточно прав для удаления события", undefined, 403);
  }
  return deleteEventRecord(id);
}
