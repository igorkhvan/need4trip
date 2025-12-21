import { supabaseAdmin, ensureAdminClient } from "@/lib/db/client";
import { InternalError, NotFoundError } from "@/lib/errors";
import { DbEvent, DbEventWithOwner } from "@/lib/mappers";
import { EventCreateInput, EventUpdateInput } from "@/lib/types/event";
import { log } from "@/lib/utils/logger";

const table = "events";

export async function listEvents(page = 1, limit = 12): Promise<{
  data: DbEvent[];
  total: number;
  hasMore: boolean;
}> {
  ensureAdminClient();
  if (!supabaseAdmin) return { data: [], total: 0, hasMore: false };
  
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabaseAdminAdmin
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
  ensureAdminClient();
  if (!supabaseAdmin) return { data: [], total: 0, hasMore: false };
  
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabaseAdmin
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
  ensureAdminClient();
  if (!supabaseAdmin) return null;
  
  if (!id || !/^[0-9a-fA-F-]{36}$/.test(id)) {
    log.warn("Invalid event id provided", { id });
    return null;
  }

  const { data, error } = await supabaseAdmin
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
  ensureAdminClient();
  if (!supabaseAdmin) {
    throw new InternalError("Supabase client is not configured");
  }
  
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

  const { data, error } = await supabaseAdmin
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
  ensureAdminClient();
  if (!supabaseAdmin) {
    throw new InternalError("Supabase client is not configured");
  }
  
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

  const { data, error } = await supabaseAdmin
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
  ensureAdminClient();
  if (!supabaseAdmin) {
    throw new InternalError("Supabase client is not configured");
  }
  
  // delete existing
  const { error: delError } = await supabaseAdmin.from("event_allowed_brands").delete().eq("event_id", eventId);
  if (delError) {
    log.error("Failed to clear allowed brands", { eventId, error: delError });
    throw new InternalError("Failed to clear allowed brands", delError);
  }
  if (!brandIds.length) return;
  const rows = brandIds.map((brandId) => ({ event_id: eventId, brand_id: brandId }));
  const { error: insError } = await supabaseAdmin.from("event_allowed_brands").insert(rows);
  if (insError) {
    log.error("Failed to insert allowed brands", { eventId, error: insError });
    throw new InternalError("Failed to insert allowed brands", insError);
  }
}

export async function getAllowedBrands(eventId: string) {
  ensureAdminClient();
  if (!supabaseAdmin) return [];
  
  const { data: links, error: linkError } = await supabaseAdmin
    .from("event_allowed_brands")
    .select("brand_id")
    .eq("event_id", eventId);
  if (linkError) {
    log.error("Failed to load allowed brand ids", { eventId, error: linkError });
    throw new InternalError("Failed to load allowed brands", linkError);
  }
  const ids = (links ?? []).map((row) => row.brand_id);
  if (!ids.length) return [];
  const { data: brands, error: brandError } = await supabaseAdmin
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

  ensureAdminClient();
  if (!supabaseAdmin) return new Map();

  // Step 1: Get all event_allowed_brands links for these events
  const { data: links, error: linkError } = await supabaseAdmin
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
  const { data: brands, error: brandError } = await supabaseAdmin
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
  ensureAdminClient();
  if (!supabaseAdmin) {
    throw new InternalError("Supabase client is not configured");
  }
  
  const { error, count } = await supabaseAdmin
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
  ensureAdminClient();
  if (!supabaseAdmin) return 0;

  const { count, error } = await supabaseAdmin
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
  ensureAdminClient();
  if (!supabaseAdmin) return 0;

  const now = new Date().toISOString();

  const { count, error } = await supabaseAdmin
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
  ensureAdminClient();
  if (!supabaseAdmin) return 0;

  const now = new Date().toISOString();

  const { count, error } = await supabaseAdmin
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
  ensureAdminClient();
  if (!supabaseAdmin) return { data: [], total: 0, hasMore: false };

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabaseAdmin
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
  ensureAdminClient();
  if (!supabaseAdmin) return { data: [], total: 0, hasMore: false };

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabaseAdmin
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
  ensureAdminClient();
  if (!supabaseAdmin) return { data: [], total: 0, hasMore: false };

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabaseAdmin
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
