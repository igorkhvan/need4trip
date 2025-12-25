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
import {
  getLocationsByEventId,
  saveLocations,
  createDefaultLocation,
} from "@/lib/db/eventLocationsRepo";
import type { EventLocationInput } from "@/lib/types/eventLocation";
import { hydrateCitiesAndCurrencies, hydrateEventCategories } from "@/lib/utils/hydration";
import {
  mapDbEventToDomain,
  mapDbEventWithOwnerToDomain,
  mapDbParticipantToDomain,
} from "@/lib/mappers";
import {
  type Event,
  type EventCreateInput,
  type EventUpdateInput,
  eventCreateSchema,
  eventUpdateSchema,
} from "@/lib/types/event";
import { DomainParticipant } from "@/lib/types/participant";
import { AuthError, ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { CurrentUser } from "@/lib/auth/currentUser";
import { upsertEventAccess, listAccessibleEventIds } from "@/lib/db/eventAccessRepo";
import { enforceClubAction } from "@/lib/services/accessControl";
import { log } from "@/lib/utils/logger";
import { enforceEventVisibility as enforceVisibility, canViewInList } from "@/lib/utils/eventVisibility";

type EventAccessOptions = {
  currentUser?: CurrentUser | null;
  enforceVisibility?: boolean;
};

/**
 * Ensure event visibility (internal wrapper)
 * 
 * Delegates to centralized enforceEventVisibility from eventVisibility.ts
 * Preserves existing API (enforceVisibility flag).
 */
async function ensureEventVisibility(event: Event, opts?: EventAccessOptions) {
  const enforce = opts?.enforceVisibility ?? false;
  if (!enforce) return;
  
  // Delegate to centralized visibility helper
  await enforceVisibility(event, opts?.currentUser ?? null, {
    autoGrantAccessForRestricted: true,
  });
}

/**
 * DEPRECATED: listEvents() and listEventsSafe() were removed for security reasons.
 * 
 * These functions returned ALL events without visibility filtering,
 * causing information disclosure vulnerability (events with visibility='unlisted' or 'restricted'
 * were exposed to unauthorized users).
 * 
 * Use listVisibleEventsForUser() instead, which properly filters events based on:
 * - Event visibility setting (public/unlisted/restricted)
 * - Current user context (anonymous vs authenticated)
 * - User's relationship to event (owner, participant, explicit access)
 * 
 * @see listVisibleEventsForUser
 * @deprecated Removed in security fix - use listVisibleEventsForUser()
 */

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
      log.errorWithStack("Failed to load participant events for user", err, { userId });
      return [];
    }),
    listAccessibleEventIds(userId).catch((err) => {
      log.errorWithStack("Failed to load accessible events for user", err, { userId });
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

  // ✅ NEW: Use centralized visibility filter (eliminates duplication)
  const participantIds = new Set(participantEventIds);
  const accessIds = new Set(accessEventIds);
  const currentUser = { id: userId } as CurrentUser; // Lightweight user object for filtering
  
  const filtered = uniqueEvents.filter(e => 
    canViewInList(e, currentUser, participantIds, accessIds)
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
    log.errorWithStack("Failed to count participants for events", err, { eventCount: eventIds.length });
    return {};
  }
  return participantEventIdsAll.reduce<Record<string, number>>((acc, eventId) => {
    acc[eventId] = (acc[eventId] ?? 0) + 1;
    return acc;
  }, {});
}

export async function hydrateEvent(event: Event): Promise<Event> {
  // ⚡ PERFORMANCE: Parallel loading of all related data
  // Before: 5 sequential DB queries (~850ms)
  // After: 1 parallel batch (~200ms) - 4x faster!
  const [
    allowedBrands,
    participantsCount,
    locations,
    hydratedWithCity,
    hydratedWithCategory
  ] = await Promise.all([
    // Load allowed brands
    getAllowedBrands(event.id).catch((err) => {
      log.warn("Failed to load allowed brands for event, using empty array", { eventId: event.id, error: err });
      return event.allowedBrands ?? [];
    }),
    
    // Count participants
    countParticipants(event.id).catch((err) => {
      log.warn("Failed to count participants for event, using 0", { eventId: event.id, error: err });
      return event.participantsCount ?? 0;
    }),
    
    // Load locations
    getLocationsByEventId(event.id).catch((err) => {
      log.warn("Failed to load locations for event, using empty array", { eventId: event.id, error: err });
      return event.locations ?? [];
    }),
    
    // Hydrate city and currency (parallel with above)
    hydrateCitiesAndCurrencies([event]).then(([hydrated]) => hydrated).catch((err) => {
      log.warn("Failed to hydrate city/currency for event", { eventId: event.id, error: err });
      return event;
    }),
    
    // Hydrate category (parallel with above)
    hydrateEventCategories([event]).then(([hydrated]) => hydrated).catch((err) => {
      log.warn("Failed to hydrate category for event", { eventId: event.id, error: err });
      return event;
    })
  ]);
  
  // Merge all hydrated data
  return {
    ...hydratedWithCity,
    ...hydratedWithCategory,
    allowedBrands,
    participantsCount,
    locations,
  };
}

export async function grantEventAccessByLink(eventId: string, userId: string): Promise<void> {
  try {
    await upsertEventAccess(eventId, userId, "link");
  } catch (err) {
    log.errorWithStack("Failed to grant event access by link", err, { eventId, userId });
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
    log.warn("Failed to load allowed brands for event, using empty array", { eventId: id, error: err });
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
    log.warn("Failed to load allowed brands for event with participants, using empty array", { eventId: id, error: err });
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
 * 
 * ВАЖНО: Для правильной проверки видимости всегда передавайте currentUser:
 * 
 * @example
 * // ✅ Правильно:
 * const currentUser = await getCurrentUser();
 * const event = await getEventBasicInfo(id, {
 *   currentUser,              // Обязательно для владельцев unlisted/restricted событий
 *   enforceVisibility: true
 * });
 * 
 * // ❌ Неправильно (Race Condition):
 * const [currentUser, event] = await Promise.all([
 *   getCurrentUser(),
 *   getEventBasicInfo(id, { enforceVisibility: true }) // currentUser ещё не загружен!
 * ]);
 * 
 * @param id Event ID
 * @param options Access options (currentUser, enforceVisibility)
 * @returns Event with basic info + participantsCount, or null if not found/no access
 */
export async function getEventBasicInfo(
  id: string,
  options?: EventAccessOptions
): Promise<(Event & { participantsCount: number }) | null> {
  const dbEvent = await getEventById(id);
  if (!dbEvent) return null;

  let event = mapDbEventToDomain(dbEvent);

  // Hydrate all related data + count participants (parallel)
  const [allowedBrands, participantsCount, locations] = await Promise.all([
    getAllowedBrands(id).catch((err) => {
      log.warn("Failed to load allowed brands for event basic info, using empty array", { eventId: id, error: err });
      return [];
    }),
    countParticipants(id),
    getLocationsByEventId(id).catch((err) => {
      log.warn("Failed to load locations for event basic info, using empty array", { eventId: id, error: err });
      return [];
    }),
  ]);

  event.allowedBrands = allowedBrands;
  event.locations = locations;

  // Hydrate city and currency
  const [hydratedEvents] = await hydrateCitiesAndCurrencies([event]);
  event = hydratedEvents;

  // Hydrate category
  const [eventWithCategory] = await hydrateEventCategories([event]);
  event = eventWithCategory;

  await ensureEventVisibility(event, options);

  return {
    ...event,
    participantsCount,
  };
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
    log.warn("Failed to load allowed brands for event with visibility, using empty array", { eventId: id, error: err });
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
  const parsed = eventCreateSchema.parse(input) as any;
  
  // Apply defaults explicitly (Zod .default() doesn't infer correctly)
  const validated: EventCreateInput = {
    title: parsed.title,
    description: parsed.description,
    categoryId: parsed.categoryId ?? null,
    dateTime: parsed.dateTime,
    cityId: parsed.cityId,
    locations: parsed.locations,
    maxParticipants: parsed.maxParticipants ?? null,
    customFieldsSchema: parsed.customFieldsSchema ?? [],
    createdByUserId: parsed.createdByUserId ?? null,
    visibility: parsed.visibility ?? "public",
    vehicleTypeRequirement: parsed.vehicleTypeRequirement ?? "any",
    allowedBrandIds: parsed.allowedBrandIds ?? [],
    rules: parsed.rules ?? null,
    isClubEvent: parsed.isClubEvent ?? false,
    clubId: parsed.clubId ?? null,
    isPaid: parsed.isPaid ?? false,
    price: parsed.price ?? null,
    currencyCode: parsed.currencyCode ?? null,
    allowAnonymousRegistration: parsed.allowAnonymousRegistration ?? true,
  };
  
  // ⚡ Check if club event requires active subscription
  if (validated.isClubEvent) {
    const { PaywallError } = await import("@/lib/errors");
    
    if (!validated.clubId) {
      // No club = personal event, cannot be club event
      throw new PaywallError({
        message: "Клубные события доступны только при наличии клуба с активной подпиской",
        reason: "CLUB_CREATION_REQUIRES_PLAN",
        currentPlanId: "free",
        requiredPlanId: "club_50",
        meta: {
          feature: "Клубные события",
        },
      });
    }
    
    // Check if club has active subscription
    const { getClubSubscription } = await import("@/lib/db/clubSubscriptionRepo");
    const subscription = await getClubSubscription(validated.clubId);
    
    if (!subscription || subscription.status !== "active") {
      throw new PaywallError({
        message: "Клубные события доступны только при активной подписке клуба",
        reason: "SUBSCRIPTION_NOT_ACTIVE",
        currentPlanId: subscription?.planId ?? "free",
        requiredPlanId: "club_50",
        meta: {
          feature: "Клубные события",
        },
      });
    }
  }
  
  // ⚡ Billing v2.0 Enforcement
  // Check if club can create event with given parameters
  if (validated.clubId) {
    await enforceClubAction({
      clubId: validated.clubId,
      action: validated.isPaid ? "CLUB_CREATE_PAID_EVENT" : "CLUB_CREATE_EVENT",
      context: {
        eventParticipantsCount: validated.maxParticipants ?? undefined,
        isPaidEvent: validated.isPaid,
      },
    });
  } else {
    // Personal events (no club) - enforce FREE plan limits from DB
    const { getPlanById } = await import("@/lib/db/planRepo");
    const { PaywallError } = await import("@/lib/errors");
    
    const freePlan = await getPlanById("free");
    
    // Check paid events limit
    if (validated.isPaid && !freePlan.allowPaidEvents) {
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
    if (validated.maxParticipants && freePlan.maxEventParticipants !== null && 
        validated.maxParticipants > freePlan.maxEventParticipants) {
      throw new PaywallError({
        message: `Превышен лимит участников (${validated.maxParticipants} > ${freePlan.maxEventParticipants})`,
        reason: "MAX_EVENT_PARTICIPANTS_EXCEEDED",
        currentPlanId: "free",
        requiredPlanId: "club_50",
        meta: {
          requested: validated.maxParticipants,
          limit: freePlan.maxEventParticipants,
        },
      });
    }
  }
  
  await ensureUserExists(currentUser.id, currentUser.name ?? undefined);
  const db = await createEventRecord({
    ...validated,
    createdByUserId: currentUser.id,
  });
  if (validated.allowedBrandIds?.length) {
    await replaceAllowedBrands(db.id, validated.allowedBrandIds);
  }
  
  // Create locations (default first location or from input)
  if (validated.locations && validated.locations.length > 0) {
    await saveLocations(db.id, validated.locations);
  } else {
    // Create default first location if not provided
    await createDefaultLocation(db.id, "Точка сбора");
  }
  
  await upsertEventAccess(db.id, currentUser.id, "owner");
  const event = mapDbEventToDomain(db);
  try {
    event.allowedBrands = await getAllowedBrands(db.id);
  } catch (err) {
    log.warn("Failed to load allowed brands for new event, using empty array", { eventId: db.id, error: err });
  }
  
  // Load locations
  try {
    event.locations = await getLocationsByEventId(db.id);
  } catch (err) {
    log.warn("Failed to load locations for new event, using empty array", { eventId: db.id, error: err });
    event.locations = [];
  }
  
  // Queue notifications for new event (non-blocking)
  if (event.visibility === "public" && event.cityId) {
    queueNewEventNotificationsAsync(event).catch((err) => {
      log.errorWithStack("Failed to queue new event notifications", err, { eventId: event.id });
    });
  }
  
  return event;
}

/**
 * Queue new event notifications asynchronously (non-blocking)
 */
async function queueNewEventNotificationsAsync(event: Event): Promise<void> {
  try {
    const cityId = event.cityId;
    const creatorId = event.createdByUserId;
    
    if (!cityId) {
      log.warn("Cannot queue event notifications: event has no cityId", { eventId: event.id });
      return;
    }
    
    if (!creatorId) {
      log.warn("Cannot queue event notifications: event has no creatorId", { eventId: event.id });
      return;
    }
    
    // Get city and category names for notification payload
    const { getCityById } = await import("@/lib/db/cityRepo");
    const { getEventCategoryById } = await import("@/lib/db/eventCategoryRepo");
    const { queueNewEventNotifications } = await import("@/lib/services/notifications");
    
    const [city, category] = await Promise.all([
      getCityById(cityId).catch(() => null),
      event.categoryId ? getEventCategoryById(event.categoryId).catch(() => null) : Promise.resolve(null),
    ]);
    
    if (!city) {
      log.warn("Cannot queue event notifications: city not found", { eventId: event.id, cityId });
      return;
    }
    
    await queueNewEventNotifications({
      eventId: event.id,
      eventTitle: event.title,
      cityId,
      cityName: city.name,
      categoryName: category?.nameRu ?? "Событие",
      dateTime: event.dateTime,
      locationText: event.locations[0]?.title ?? "Не указано",
      creatorId,
    });
  } catch (err) {
    log.errorWithStack("Unexpected error queueing new event notifications", err, { eventId: event.id });
    throw err;
  }
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
  const parsed = eventUpdateSchema.parse(input) as any;
  
  // Apply defaults explicitly for EventUpdateInput
  const validated: EventUpdateInput = {
    ...parsed,
    // Ensure null coalescing for optional fields
    categoryId: parsed.categoryId !== undefined ? parsed.categoryId : undefined,
    maxParticipants: parsed.maxParticipants !== undefined ? parsed.maxParticipants : undefined,
    customFieldsSchema: parsed.customFieldsSchema !== undefined ? parsed.customFieldsSchema : undefined,
    createdByUserId: parsed.createdByUserId !== undefined ? parsed.createdByUserId : undefined,
    visibility: parsed.visibility !== undefined ? parsed.visibility : undefined,
    vehicleTypeRequirement: parsed.vehicleTypeRequirement !== undefined ? parsed.vehicleTypeRequirement : undefined,
    allowedBrandIds: parsed.allowedBrandIds !== undefined ? parsed.allowedBrandIds : undefined,
    rules: parsed.rules !== undefined ? parsed.rules : undefined,
    isClubEvent: parsed.isClubEvent !== undefined ? parsed.isClubEvent : undefined,
    clubId: parsed.clubId !== undefined ? parsed.clubId : undefined,
    isPaid: parsed.isPaid !== undefined ? parsed.isPaid : undefined,
    price: parsed.price !== undefined ? parsed.price : undefined,
    currencyCode: parsed.currencyCode !== undefined ? parsed.currencyCode : undefined,
    allowAnonymousRegistration: parsed.allowAnonymousRegistration !== undefined ? parsed.allowAnonymousRegistration : undefined,
    registrationManuallyClosed: parsed.registrationManuallyClosed !== undefined ? parsed.registrationManuallyClosed : undefined,
  };
  
  const existing = await getEventById(id);
  if (!existing) {
    throw new NotFoundError("Event not found");
  }
  if (existing.created_by_user_id !== currentUser.id) {
    throw new AuthError("Недостаточно прав для изменения события", undefined, 403);
  }

  // Валидация даты: разрешаем менять прошедшие события на будущие даты
  // Новая дата всегда должна быть в будущем (минимум через 5 минут)
  if (validated.dateTime) {
    const date5MinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (validated.dateTime <= date5MinutesAgo) {
      throw new ValidationError(
        "Дата события должна быть в будущем (минимум через 5 минут)"
      );
    }
  }

  const participantsCount = await countParticipants(id);

  if (validated.maxParticipants !== undefined && validated.maxParticipants !== null) {
    if (validated.maxParticipants < participantsCount) {
      throw new ConflictError("maxParticipants is below current registered users", {
        currentCount: participantsCount,
      });
    }
  }

  if (participantsCount > 0 && validated.customFieldsSchema !== undefined) {
    const validation = validateCustomFieldsUpdate(
      validated.customFieldsSchema,
      existing.custom_fields_schema
    );
    if (!validation.valid) {
      throw new ValidationError(
        validation.error || "Нельзя удалять существующие поля - они используются участниками"
      );
    }
  }

  // ⚡ Check if club event requires active subscription
  const finalIsClubEvent = parsed.isClubEvent !== undefined 
    ? parsed.isClubEvent 
    : existing.is_club_event;
  
  if (finalIsClubEvent) {
    const { PaywallError } = await import("@/lib/errors");
    
    if (!existing.club_id) {
      // Cannot make personal event into club event
      throw new PaywallError({
        message: "Клубные события доступны только при наличии клуба с активной подпиской",
        reason: "CLUB_CREATION_REQUIRES_PLAN",
        currentPlanId: "free",
        requiredPlanId: "club_50",
        meta: {
          feature: "Клубные события",
        },
      });
    }
    
    // Check if club has active subscription
    const { getClubSubscription } = await import("@/lib/db/clubSubscriptionRepo");
    const subscription = await getClubSubscription(existing.club_id);
    
    if (!subscription || subscription.status !== "active") {
      throw new PaywallError({
        message: "Клубные события доступны только при активной подписке клуба",
        reason: "SUBSCRIPTION_NOT_ACTIVE",
        currentPlanId: subscription?.planId ?? "free",
        requiredPlanId: "club_50",
        meta: {
          feature: "Клубные события",
        },
      });
    }
  }
  
  // ⚡ Billing v2.0 Enforcement for updates
  // Check if changes violate plan limits
  const finalMaxParticipants = validated.maxParticipants !== undefined 
    ? validated.maxParticipants 
    : existing.max_participants;
  const finalIsPaid = validated.isPaid !== undefined 
    ? validated.isPaid 
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

  // Prepare patch for database update
  const patch: EventUpdateInput = {
    ...parsed,
    // Convert dateTime to Date object if provided
    dateTime: parsed.dateTime
      ? parsed.dateTime instanceof Date
        ? parsed.dateTime
        : new Date(parsed.dateTime)
      : undefined,
  };

  const updated = await updateEventRecord(id, patch);
  if (!updated) {
    throw new NotFoundError("Event not found");
  }
  if (parsed.allowedBrandIds) {
    await replaceAllowedBrands(id, parsed.allowedBrandIds);
  }
  
  // Update locations if provided
  if (parsed.locations) {
    await saveLocations(id, parsed.locations);
  }
  
  const event = mapDbEventToDomain(updated);
  try {
    event.allowedBrands = await getAllowedBrands(id);
  } catch (err) {
    log.warn("Failed to load allowed brands for updated event, using empty array", { eventId: id, error: err });
  }
  
  // Load locations
  try {
    event.locations = await getLocationsByEventId(id);
  } catch (err) {
    log.warn("Failed to load locations for updated event, using empty array", { eventId: id, error: err });
    event.locations = [];
  }
  
  // Queue event update notifications to participants (non-blocking)
  if (participantsCount > 0) {
    queueEventUpdatedNotificationsAsync(
      existing,
      updated,
      parsed
    ).catch((err) => {
      log.errorWithStack("Failed to queue event update notifications", err, { eventId: id });
    });
  }
  
  return event;
}

/**
 * Detect changes and queue update notifications (non-blocking)
 */
async function queueEventUpdatedNotificationsAsync(
  existing: Awaited<ReturnType<typeof getEventById>>,
  updated: Awaited<ReturnType<typeof updateEventRecord>>,
  parsed: EventUpdateInput
): Promise<void> {
  if (!existing || !updated) return;
  
  try {
    const { listParticipants } = await import("@/lib/db/participantRepo");
    const { queueEventUpdatedNotifications } = await import("@/lib/services/notifications");
    const { detectLocationChanges } = await import("@/lib/utils/eventChanges");
    
    // Check if locations changed (need to load before/after)
    let locationsChanged = false;
    if (parsed.locations) {
      const [oldLocations, newLocations] = await Promise.all([
        getLocationsByEventId(existing.id).catch(() => []),
        getLocationsByEventId(updated.id).catch(() => []),
      ]);
      locationsChanged = detectLocationChanges(oldLocations, newLocations);
    }
    
    // Detect changes
    const changes = {
      dateTimeChanged: parsed.dateTime !== undefined && 
        new Date(existing.date_time).getTime() !== new Date(updated.date_time).getTime(),
      locationChanged: locationsChanged,
      rulesChanged: parsed.rules !== undefined && 
        existing.rules !== updated.rules,
      maxParticipantsChanged: parsed.maxParticipants !== undefined &&
        existing.max_participants !== updated.max_participants,
      paymentChanged: (parsed.isPaid !== undefined && existing.is_paid !== updated.is_paid) ||
        (parsed.price !== undefined && existing.price !== updated.price),
      vehicleRequirementChanged: parsed.vehicleTypeRequirement !== undefined && 
        existing.vehicle_type_requirement !== updated.vehicle_type_requirement,
    };
    
    // Check if any meaningful changes occurred
    const hasChanges = Object.values(changes).some(Boolean);
    if (!hasChanges) {
      log.debug("No meaningful changes detected for event update notifications", { eventId: updated.id });
      return;
    }
    
    // Get all participants
    const participants = await listParticipants(updated.id);
    if (participants.length === 0) {
      log.debug("No participants to notify for event update", { eventId: updated.id });
      return;
    }
    
    // Get event version for deduplication
    const eventVersion = updated.version;
    
    await queueEventUpdatedNotifications({
      eventId: updated.id,
      eventTitle: updated.title,
      eventVersion,
      changes,
      participantIds: participants.map(p => p.id),
    });
  } catch (err) {
    log.errorWithStack("Unexpected error queueing event update notifications", err, { eventId: updated.id });
    throw err;
  }
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
