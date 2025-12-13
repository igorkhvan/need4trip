import { supabase } from "@/lib/db/client";
import { InternalError, NotFoundError } from "@/lib/errors";
import { DbEvent, DbEventWithOwner } from "@/lib/mappers";
import { EventCreateInput, EventUpdateInput } from "@/lib/types/event";

const table = "events";

function ensureClient() {
  if (!supabase) {
    console.warn("Supabase client is not configured");
    return null;
  }
  return supabase;
}

export async function listEvents(): Promise<DbEvent[]> {
  const client = ensureClient();
  if (!client) return [];
  const { data, error } = await client
    .from(table)
    .select("*")
    .order("date_time", { ascending: true });

  if (error) {
    console.error("Failed to list events", error);
    throw new InternalError("Failed to list events", error);
  }

  return (data ?? []) as DbEvent[];
}

export async function listEventsWithOwner(): Promise<DbEventWithOwner[]> {
  const client = ensureClient();
  if (!client) return [];
  const { data, error } = await client
    .from(table)
    .select("*, created_by_user:users(id, name, telegram_handle)")
    .order("date_time", { ascending: true });

  if (error) {
    console.error("Failed to list events with owner", error);
    throw new InternalError("Failed to list events", error);
  }

  return (data ?? []) as DbEventWithOwner[];
}

export async function getEventById(id: string): Promise<DbEvent | null> {
  const client = ensureClient();
  if (!client) return null;
  if (!id || !/^[0-9a-fA-F-]{36}$/.test(id)) {
    console.warn("Invalid event id provided", id);
    return null;
  }

  const { data, error } = await client
    .from(table)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(`Failed to get event ${id}`, error);
    throw new InternalError("Failed to get event", error);
  }

  return data ? (data as DbEvent) : null;
}

export async function createEvent(payload: EventCreateInput): Promise<DbEvent> {
  const client = ensureClient();
  if (!client) {
    throw new InternalError("Supabase client is not configured");
  }
  const now = new Date().toISOString();

  const insertPayload = {
    title: payload.title,
    description: payload.description,
    category_id: payload.categoryId ?? null, // FK to event_categories
    date_time:
      payload.dateTime instanceof Date
        ? payload.dateTime.toISOString()
        : payload.dateTime,
    city_id: payload.cityId ?? null, // FK на cities (normalized)
    location_text: payload.locationText,
    location_lat: payload.locationLat ?? null,
    location_lng: payload.locationLng ?? null,
    max_participants: payload.maxParticipants ?? null,
    custom_fields_schema: payload.customFieldsSchema ?? [],
    created_by_user_id: payload.createdByUserId ?? null,
    created_at: now,
    updated_at: now,
    visibility: payload.visibility ?? "public",
    vehicle_type_requirement: payload.vehicleTypeRequirement ?? "any",
    rules: payload.rules ?? null,
    is_club_event: payload.isClubEvent ?? false,
    is_paid: payload.isPaid ?? false,
    price: payload.price ?? null,
    currency_code: payload.currencyCode ?? null, // ISO 4217 (normalized)
  };

  const { data, error } = await client
    .from(table)
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to create event", error);
    throw new InternalError("Failed to create event", error);
  }

  return data as DbEvent;
}

export async function updateEvent(
  id: string,
  payload: EventUpdateInput
): Promise<DbEvent | null> {
  const client = ensureClient();
  if (!client) {
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
    ...(payload.cityId !== undefined ? { city_id: payload.cityId } : {}), // FK на cities (normalized)
    ...(payload.locationText !== undefined ? { location_text: payload.locationText } : {}),
    ...(payload.locationLat !== undefined ? { location_lat: payload.locationLat } : {}),
    ...(payload.locationLng !== undefined ? { location_lng: payload.locationLng } : {}),
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
    ...(payload.currencyCode !== undefined ? { currency_code: payload.currencyCode } : {}), // ISO 4217 (normalized)
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from(table)
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error(`Failed to update event ${id}`, error);
    throw new InternalError("Failed to update event", error);
  }

  return data ? (data as DbEvent) : null;
}

export async function replaceAllowedBrands(eventId: string, brandIds: string[]): Promise<void> {
  const client = ensureClient();
  if (!client) {
    throw new InternalError("Supabase client is not configured");
  }
  // delete existing
  const { error: delError } = await client.from("event_allowed_brands").delete().eq("event_id", eventId);
  if (delError) {
    console.error("Failed to clear allowed brands", delError);
    throw new InternalError("Failed to clear allowed brands", delError);
  }
  if (!brandIds.length) return;
  const rows = brandIds.map((brandId) => ({ event_id: eventId, brand_id: brandId }));
  const { error: insError } = await client.from("event_allowed_brands").insert(rows);
  if (insError) {
    console.error("Failed to insert allowed brands", insError);
    throw new InternalError("Failed to insert allowed brands", insError);
  }
}

export async function getAllowedBrands(eventId: string) {
  const client = ensureClient();
  if (!client) return [];
  const { data: links, error: linkError } = await client
    .from("event_allowed_brands")
    .select("brand_id")
    .eq("event_id", eventId);
  if (linkError) {
    console.error("Failed to load allowed brand ids", linkError);
    throw new InternalError("Failed to load allowed brands", linkError);
  }
  const ids = (links ?? []).map((row) => row.brand_id);
  if (!ids.length) return [];
  const { data: brands, error: brandError } = await client
    .from("car_brands")
    .select("id, name, slug")
    .in("id", ids);
  if (brandError) {
    console.error("Failed to load allowed brands", brandError);
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

  const client = ensureClient();
  if (!client) return new Map();

  // Step 1: Get all event_allowed_brands links for these events
  const { data: links, error: linkError } = await client
    .from("event_allowed_brands")
    .select("event_id, brand_id")
    .in("event_id", eventIds);

  if (linkError) {
    console.error("Failed to load allowed brand links", linkError);
    throw new InternalError("Failed to load allowed brand links", linkError);
  }

  if (!links || links.length === 0) {
    return new Map();
  }

  // Step 2: Get unique brand IDs
  const brandIds = Array.from(new Set(links.map(link => link.brand_id)));

  // Step 3: Load all brands at once
  const { data: brands, error: brandError } = await client
    .from("car_brands")
    .select("id, name, slug")
    .in("id", brandIds);

  if (brandError) {
    console.error("Failed to load brands", brandError);
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
  const client = ensureClient();
  if (!client) {
    throw new InternalError("Supabase client is not configured");
  }
  const { error, count } = await client
    .from(table)
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    console.error(`Failed to delete event ${id}`, error);
    throw new InternalError("Failed to delete event", error);
  }

  if ((count ?? 0) === 0) {
    throw new NotFoundError("Event not found");
  }

  return true;
}
