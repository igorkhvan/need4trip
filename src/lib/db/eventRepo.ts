import { getAdminDbSafe, getAdminDb } from "@/lib/db/client";
import { InternalError, NotFoundError } from "@/lib/errors";
import { DbEvent, DbEventWithOwner } from "@/lib/mappers";
import { EventCreateInput, EventUpdateInput, Visibility } from "@/lib/types/event";
import { log } from "@/lib/utils/logger";

const table = "events";

/**
 * EventListItem DTO (lightweight for listings)
 * 
 * SSOT: This is the canonical listing type returned by repo listing queries.
 * Does NOT include heavy fields (rules, custom_fields_schema).
 * Does NOT include owner info (loaded separately if needed).
 */
export interface EventListItem {
  id: string;
  title: string;
  description: string;
  dateTime: string;
  cityId: string;
  categoryId: string | null;
  maxParticipants: number | null;
  priceAmount: number | null;
  priceCurrency: string | null;
  visibility: Visibility;
  isPaid: boolean;
  createdByUserId: string | null;
  clubId: string | null;
  isClubEvent: boolean;
}

/**
 * EVENT_LIST_COLUMNS (SSOT)
 * 
 * Explicit column list for listing queries (NO select('*')).
 * Excludes heavy fields: rules, custom_fields_schema.
 */
const EVENT_LIST_COLUMNS = `
  id, title, description, date_time, city_id, category_id,
  max_participants, price, currency_code, visibility,
  is_paid, created_by_user_id, club_id, is_club_event
`.trim();

/**
 * Mapper: DB row → EventListItem
 * 
 * SSOT: Colocated with eventRepo (see ARCHITECTURE.md § 10).
 */
export function mapDbRowToListItem(row: any): EventListItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    dateTime: row.date_time,
    cityId: row.city_id,
    categoryId: row.category_id ?? null,
    maxParticipants: row.max_participants ?? null,
    priceAmount: row.price ?? null,
    priceCurrency: row.currency_code ?? null,
    visibility: row.visibility ?? "public",
    isPaid: row.is_paid ?? false,
    createdByUserId: row.created_by_user_id ?? null,
    clubId: row.club_id ?? null,
    isClubEvent: row.is_club_event ?? false,
  };
}

export async function listEvents(page = 1, limit = 12): Promise<{
  data: DbEvent[];
  total: number;
  hasMore: boolean;
}> {
  const db = getAdminDbSafe();
  if (!db) return { data: [], total: 0, hasMore: false };
  
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count} = await db
    .from(table)
    .select("*", { count: "exact" })
    .order("date_time", { ascending: false })
    .range(from, to);

  if (error) {
    log.error("Failed to list events", { error });
    throw new InternalError("Failed to list events", error);
  }

  // Supabase types custom_fields_schema as Json, cast to proper type
  const events = (data ?? []).map((row: any) => ({
    ...row,
    custom_fields_schema: row.custom_fields_schema ?? [],
  })) as unknown as DbEvent[];

  return {
    data: events,
    total: count ?? 0,
    hasMore: (count ?? 0) > to + 1,
  };
}

export async function listEventsWithOwner(page = 1, limit = 12): Promise<{
  data: DbEventWithOwner[];
  total: number;
  hasMore: boolean;
}> {
  const db = getAdminDbSafe();
  if (!db) return { data: [], total: 0, hasMore: false };
  
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await db
    .from(table)
    .select("*, created_by_user:users(id, name, telegram_handle)", { count: "exact" })
    .order("date_time", { ascending: false })
    .range(from, to);

  if (error) {
    log.error("Failed to list events with owner", { error });
    throw new InternalError("Failed to list events", error);
  }

  // Supabase types custom_fields_schema as Json, cast to proper type
  const events = (data ?? []).map((row: any) => ({
    ...row,
    custom_fields_schema: row.custom_fields_schema ?? [],
  })) as unknown as DbEventWithOwner[];

  return {
    data: events,
    total: count ?? 0,
    hasMore: (count ?? 0) > to + 1,
  };
}

export async function getEventById(id: string): Promise<DbEvent | null> {
  const db = getAdminDbSafe();
  if (!db) return null;
  
  if (!id || !/^[0-9a-fA-F-]{36}$/.test(id)) {
    log.warn("Invalid event id provided", { id });
    return null;
  }

  const { data, error } = await db
    .from(table)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    log.error("Failed to get event", { eventId: id, error });
    throw new InternalError("Failed to get event", error);
  }

  if (!data) return null;

  // Cast custom_fields_schema from Json
  return {
    ...data,
    custom_fields_schema: data.custom_fields_schema ?? [],
  } as unknown as DbEvent;
}

export async function createEvent(payload: EventCreateInput): Promise<DbEvent> {
  const db = getAdminDb();
  
  const now = new Date().toISOString();

  const insertPayload = {
    title: payload.title,
    description: payload.description,
    category_id: payload.categoryId,
    date_time:
      payload.dateTime instanceof Date
        ? payload.dateTime.toISOString()
        : payload.dateTime,
    city_id: payload.cityId,
    max_participants: payload.maxParticipants,
    custom_fields_schema: payload.customFieldsSchema,
    created_by_user_id: payload.createdByUserId,
    created_at: now,
    updated_at: now,
    visibility: payload.visibility,
    vehicle_type_requirement: payload.vehicleTypeRequirement,
    rules: payload.rules,
    is_club_event: payload.isClubEvent,
    is_paid: payload.isPaid,
    price: payload.price,
    currency_code: payload.currencyCode,
    allow_anonymous_registration: payload.allowAnonymousRegistration,
  };

  const { data, error } = await db
    .from(table)
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    log.error("Failed to create event", { error });
    throw new InternalError("Failed to create event", error);
  }

  // Cast custom_fields_schema from Json
  return {
    ...data,
    custom_fields_schema: data.custom_fields_schema ?? [],
  } as unknown as DbEvent;
}

export async function updateEvent(
  id: string,
  payload: EventUpdateInput
): Promise<DbEvent | null> {
  const db = getAdminDb();
  
  const patch = {
    ...(payload.title !== undefined ? { title: payload.title } : {}),
    ...(payload.description !== undefined ? { description: payload.description } : {}),
    ...(payload.categoryId !== undefined ? { category_id: payload.categoryId } : {}), // FK to event_categories
    ...(payload.dateTime !== undefined
      ? {
          date_time:
            payload.dateTime instanceof Date
              ? payload.dateTime.toISOString()
              : payload.dateTime,
        }
      : {}),
    ...(payload.cityId !== undefined ? { city_id: payload.cityId } : {}),
    ...(payload.maxParticipants !== undefined
      ? { max_participants: payload.maxParticipants }
      : {}),
    ...(payload.customFieldsSchema !== undefined
      ? { custom_fields_schema: payload.customFieldsSchema }
      : {}),
    ...(payload.createdByUserId !== undefined
      ? { created_by_user_id: payload.createdByUserId }
      : {}),
    ...(payload.visibility !== undefined ? { visibility: payload.visibility } : {}),
    ...(payload.vehicleTypeRequirement !== undefined
      ? { vehicle_type_requirement: payload.vehicleTypeRequirement }
      : {}),
    ...(payload.rules !== undefined ? { rules: payload.rules } : {}),
    ...(payload.isClubEvent !== undefined ? { is_club_event: payload.isClubEvent } : {}),
    ...(payload.isPaid !== undefined ? { is_paid: payload.isPaid } : {}),
    ...(payload.price !== undefined ? { price: payload.price } : {}),
    ...(payload.currencyCode !== undefined ? { currency_code: payload.currencyCode } : {}),
    ...(payload.allowAnonymousRegistration !== undefined 
      ? { allow_anonymous_registration: payload.allowAnonymousRegistration } 
      : {}),
    ...(payload.registrationManuallyClosed !== undefined 
      ? { registration_manually_closed: payload.registrationManuallyClosed } 
      : {}),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await db
    .from(table)
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    log.error("Failed to update event", { eventId: id, error });
    throw new InternalError("Failed to update event", error);
  }

  if (!data) return null;

  // Cast custom_fields_schema from Json
  return {
    ...data,
    custom_fields_schema: data.custom_fields_schema ?? [],
  } as unknown as DbEvent;
}

export async function replaceAllowedBrands(eventId: string, brandIds: string[]): Promise<void> {
  const db = getAdminDb();
  
  // delete existing
  const { error: delError } = await db.from("event_allowed_brands").delete().eq("event_id", eventId);
  if (delError) {
    log.error("Failed to clear allowed brands", { eventId, error: delError });
    throw new InternalError("Failed to clear allowed brands", delError);
  }
  if (!brandIds.length) return;
  const rows = brandIds.map((brandId) => ({ event_id: eventId, brand_id: brandId }));
  const { error: insError } = await db.from("event_allowed_brands").insert(rows);
  if (insError) {
    log.error("Failed to insert allowed brands", { eventId, error: insError });
    throw new InternalError("Failed to insert allowed brands", insError);
  }
}

export async function getAllowedBrands(eventId: string) {
  const db = getAdminDbSafe();
  if (!db) return [];
  
  const { data: links, error: linkError } = await db
    .from("event_allowed_brands")
    .select("brand_id")
    .eq("event_id", eventId);
  if (linkError) {
    log.error("Failed to load allowed brand ids", { eventId, error: linkError });
    throw new InternalError("Failed to load allowed brands", linkError);
  }
  const ids = (links ?? []).map((row) => row.brand_id);
  if (!ids.length) return [];
  const { data: brands, error: brandError } = await db
    .from("car_brands")
    .select("id, name, slug")
    .in("id", ids);
  if (brandError) {
    log.error("Failed to load allowed brands", { eventId, error: brandError });
    throw new InternalError("Failed to load allowed brands", brandError);
  }
  return brands ?? [];
}

/**
 * Batch load allowed brands for multiple events
 * Returns Map<eventId, Brand[]> for efficient lookup
 */
export async function getAllowedBrandsByEventIds(
  eventIds: string[]
): Promise<Map<string, Array<{ id: string; name: string; slug: string }>>> {
  if (eventIds.length === 0) {
    return new Map();
  }

  const db = getAdminDbSafe();
  if (!db) return new Map();

  // Step 1: Get all event_allowed_brands links for these events
  const { data: links, error: linkError } = await db
    .from("event_allowed_brands")
    .select("event_id, brand_id")
    .in("event_id", eventIds);

  if (linkError) {
    log.error("Failed to load allowed brand links", { eventCount: eventIds.length, error: linkError });
    throw new InternalError("Failed to load allowed brand links", linkError);
  }

  if (!links || links.length === 0) {
    return new Map();
  }

  // Step 2: Get unique brand IDs
  const brandIds = Array.from(new Set(links.map(link => link.brand_id)));

  // Step 3: Load all brands at once
  const { data: brands, error: brandError } = await db
    .from("car_brands")
    .select("id, name, slug")
    .in("id", brandIds);

  if (brandError) {
    log.error("Failed to load brands", { brandCount: brandIds.length, error: brandError });
    throw new InternalError("Failed to load brands", brandError);
  }

  // Step 4: Create brand lookup map
  const brandMap = new Map<string, { id: string; name: string; slug: string }>();
  (brands ?? []).forEach((brand: any) => {
    brandMap.set(brand.id, {
      id: brand.id,
      name: brand.name,
      slug: brand.slug ?? "",
    });
  });

  // Step 5: Group brands by event_id
  const result = new Map<string, Array<{ id: string; name: string; slug: string }>>();
  
  // Initialize empty arrays for all events
  eventIds.forEach(id => result.set(id, []));
  
  // Fill with brands
  links.forEach(link => {
    const brand = brandMap.get(link.brand_id);
    if (brand) {
      const eventBrands = result.get(link.event_id) ?? [];
      eventBrands.push(brand);
      result.set(link.event_id, eventBrands);
    }
  });

  return result;
}

export async function deleteEvent(id: string): Promise<boolean> {
  const db = getAdminDb();
  
  const { error, count } = await db
    .from(table)
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    log.error("Failed to delete event", { eventId: id, error });
    throw new InternalError("Failed to delete event", error);
  }

  if ((count ?? 0) === 0) {
    throw new NotFoundError("Event not found");
  }

  return true;
}

/**
 * Count events for a specific club
 */
export async function countClubEvents(clubId: string): Promise<number> {
  const db = getAdminDbSafe();
  if (!db) return 0;

  const { count, error } = await db
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("club_id", clubId);

  if (error) {
    log.error("Failed to count club events", { clubId, error });
    throw new InternalError("Failed to count club events", error);
  }

  return count ?? 0;
}

/**
 * Count active (future) events for a specific club
 */
export async function countActiveClubEvents(clubId: string): Promise<number> {
  const db = getAdminDbSafe();
  if (!db) return 0;

  const now = new Date().toISOString();

  const { count, error } = await db
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("club_id", clubId)
    .gte("date_time", now);

  if (error) {
    log.error("Failed to count active club events", { clubId, error });
    throw new InternalError("Failed to count active club events", error);
  }

  return count ?? 0;
}

/**
 * Count past events for a specific club
 */
export async function countPastClubEvents(clubId: string): Promise<number> {
  const db = getAdminDbSafe();
  if (!db) return 0;

  const now = new Date().toISOString();

  const { count, error } = await db
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("club_id", clubId)
    .lt("date_time", now);

  if (error) {
    log.error("Failed to count past club events", { clubId, error });
    throw new InternalError("Failed to count past club events", error);
  }

  return count ?? 0;
}

/**
 * List events for a specific club with pagination
 */
export async function listClubEvents(
  clubId: string,
  page = 1,
  limit = 12
): Promise<{
  data: DbEvent[];
  total: number;
  hasMore: boolean;
}> {
  const db = getAdminDbSafe();
  if (!db) return { data: [], total: 0, hasMore: false };

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await db
    .from(table)
    .select("*", { count: "exact" })
    .eq("club_id", clubId)
    .order("date_time", { ascending: true })
    .range(from, to);

  if (error) {
    log.error("Failed to list club events", { clubId, error });
    throw new InternalError("Failed to list club events", error);
  }

  const events = (data ?? []).map((row: any) => ({
    ...row,
    custom_fields_schema: row.custom_fields_schema ?? [],
  })) as unknown as DbEvent[];

  return {
    data: events,
    total: count ?? 0,
    hasMore: (count ?? 0) > to + 1,
  };
}

/**
 * List public events (for unauthenticated users or homepage)
 */
export async function listPublicEvents(page = 1, limit = 100): Promise<{
  data: DbEventWithOwner[];
  total: number;
  hasMore: boolean;
}> {
  const db = getAdminDbSafe();
  if (!db) return { data: [], total: 0, hasMore: false };

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await db
    .from(table)
    .select("*, created_by_user:users(id, name, telegram_handle)", { count: "exact" })
    .eq("visibility", "public")
    .order("date_time", { ascending: true })
    .range(from, to);

  if (error) {
    log.error("Failed to list public events", { error });
    throw new InternalError("Failed to list public events", error);
  }

  const events = (data ?? []).map((row: any) => ({
    ...row,
    custom_fields_schema: row.custom_fields_schema ?? [],
  })) as unknown as DbEventWithOwner[];

  return {
    data: events,
    total: count ?? 0,
    hasMore: (count ?? 0) > to + 1,
  };
}

/**
 * List events created by a specific user
 */
export async function listEventsByCreator(
  userId: string,
  page = 1,
  limit = 100
): Promise<{
  data: DbEventWithOwner[];
  total: number;
  hasMore: boolean;
}> {
  const db = getAdminDbSafe();
  if (!db) return { data: [], total: 0, hasMore: false };

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await db
    .from(table)
    .select("*, created_by_user:users(id, name, telegram_handle)", { count: "exact" })
    .eq("created_by_user_id", userId)
    .order("date_time", { ascending: true })
    .range(from, to);

  if (error) {
    log.error("Failed to list events by creator", { userId, error });
    throw new InternalError("Failed to list events by creator", error);
  }

  const events = (data ?? []).map((row: any) => ({
    ...row,
    custom_fields_schema: row.custom_fields_schema ?? [],
  })) as unknown as DbEventWithOwner[];

  return {
    data: events,
    total: count ?? 0,
    hasMore: (count ?? 0) > to + 1,
  };
}

/**
 * =============================================================================
 * NEW PAGINATION API (Phase 1) — SSOT § 10
 * =============================================================================
 */

export interface EventListFilters {
  tab: 'all' | 'upcoming' | 'my';
  search?: string;
  cityId?: string;
  categoryId?: string;
}

export interface EventListSort {
  sort: 'date' | 'name';
}

export interface EventListPagination {
  page: number;  // 1-based
  limit: number; // default 12, clamped 1..50
}

export interface EventListResult {
  data: EventListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Query public events with filters, sort, pagination (tab=all, tab=upcoming)
 * 
 * SSOT: Explicit columns (EVENT_LIST_COLUMNS), stable sort (date_time+id or title+id).
 */
export async function queryEventsPaginated(
  filters: EventListFilters,
  sort: EventListSort,
  pagination: EventListPagination
): Promise<EventListResult> {
  const db = getAdminDbSafe();
  if (!db) {
    return {
      data: [],
      total: 0,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: 0,
      hasMore: false,
    };
  }

  // Clamp limit
  const limit = Math.max(1, Math.min(50, pagination.limit));
  const offset = (pagination.page - 1) * limit;

  // Base query
  let query = db
    .from(table)
    .select(EVENT_LIST_COLUMNS, { count: "exact" });

  // Filters
  if (filters.tab === 'all') {
    query = query.eq('visibility', 'public');
  } else if (filters.tab === 'upcoming') {
    const now = new Date().toISOString();
    query = query.eq('visibility', 'public').gte('date_time', now);
  }

  if (filters.search) {
    query = query.ilike('title', `%${filters.search}%`);
  }

  if (filters.cityId) {
    query = query.eq('city_id', filters.cityId);
  }

  if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }

  // Sort (stable tie-breaker REQUIRED)
  if (sort.sort === 'date') {
    query = query.order('date_time', { ascending: false }).order('id', { ascending: false });
  } else if (sort.sort === 'name') {
    query = query.order('title', { ascending: true }).order('id', { ascending: true });
  }

  // Pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    log.error("Failed to query events paginated", { filters, sort, pagination, error });
    throw new InternalError("Failed to query events", error);
  }

  const events = (data ?? []).map(mapDbRowToListItem);
  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);
  const hasMore = pagination.page < totalPages;

  return {
    data: events,
    total,
    page: pagination.page,
    limit,
    totalPages,
    hasMore,
  };
}

/**
 * Query events by IDs subset (for tab=my after collecting user's event IDs)
 * 
 * SSOT: Same filters/sort/pagination as queryEventsPaginated, but operates on ID list.
 */
export async function queryEventsByIdsPaginated(
  eventIds: string[],
  filters: EventListFilters,
  sort: EventListSort,
  pagination: EventListPagination
): Promise<EventListResult> {
  const db = getAdminDbSafe();
  if (!db || eventIds.length === 0) {
    return {
      data: [],
      total: 0,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: 0,
      hasMore: false,
    };
  }

  // Clamp limit
  const limit = Math.max(1, Math.min(50, pagination.limit));
  const offset = (pagination.page - 1) * limit;

  // Base query: filter by IDs
  let query = db
    .from(table)
    .select(EVENT_LIST_COLUMNS, { count: "exact" })
    .in('id', eventIds);

  // Additional filters (search, city, category)
  if (filters.search) {
    query = query.ilike('title', `%${filters.search}%`);
  }

  if (filters.cityId) {
    query = query.eq('city_id', filters.cityId);
  }

  if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }

  // Sort (stable tie-breaker)
  if (sort.sort === 'date') {
    query = query.order('date_time', { ascending: false }).order('id', { ascending: false });
  } else if (sort.sort === 'name') {
    query = query.order('title', { ascending: true }).order('id', { ascending: true });
  }

  // Pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    log.error("Failed to query events by IDs", { eventIdsCount: eventIds.length, filters, sort, pagination, error });
    throw new InternalError("Failed to query events by IDs", error);
  }

  const events = (data ?? []).map(mapDbRowToListItem);
  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);
  const hasMore = pagination.page < totalPages;

  return {
    data: events,
    total,
    page: pagination.page,
    limit,
    totalPages,
    hasMore,
  };
}

/**
 * Count events matching filters (for stats endpoint)
 */
export async function countEventsByFilters(filters: EventListFilters): Promise<number> {
  const db = getAdminDbSafe();
  if (!db) return 0;

  let query = db.from(table).select('*', { count: 'exact', head: true });

  // Filters
  if (filters.tab === 'all') {
    query = query.eq('visibility', 'public');
  } else if (filters.tab === 'upcoming') {
    const now = new Date().toISOString();
    query = query.eq('visibility', 'public').gte('date_time', now);
  }

  if (filters.search) {
    query = query.ilike('title', `%${filters.search}%`);
  }

  if (filters.cityId) {
    query = query.eq('city_id', filters.cityId);
  }

  if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }

  const { count, error } = await query;

  if (error) {
    log.error("Failed to count events by filters", { filters, error });
    throw new InternalError("Failed to count events", error);
  }

  return count ?? 0;
}

/**
 * Count events by ID list (for tab=my stats)
 */
export async function countEventsByIds(
  eventIds: string[],
  filters: EventListFilters
): Promise<number> {
  const db = getAdminDbSafe();
  if (!db || eventIds.length === 0) return 0;

  let query = db.from(table).select('*', { count: 'exact', head: true }).in('id', eventIds);

  // Additional filters
  if (filters.search) {
    query = query.ilike('title', `%${filters.search}%`);
  }

  if (filters.cityId) {
    query = query.eq('city_id', filters.cityId);
  }

  if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }

  const { count, error } = await query;

  if (error) {
    log.error("Failed to count events by IDs", { eventIdsCount: eventIds.length, filters, error });
    throw new InternalError("Failed to count events by IDs", error);
  }

  return count ?? 0;
}
