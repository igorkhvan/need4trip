import { supabase } from "@/lib/db/client";
import { InternalError, NotFoundError } from "@/lib/errors";
import { DbEvent } from "@/lib/mappers";
import { EventCreateInput, EventUpdateInput } from "@/lib/types/event";

const table = "events";

function ensureClient() {
  if (!supabase) {
    throw new InternalError("Supabase client is not configured");
  }
  return supabase;
}

export async function listEvents(): Promise<DbEvent[]> {
  const client = ensureClient();
  const { data, error } = await client
    .from<DbEvent>(table)
    .select("*")
    .order("date_time", { ascending: true });

  if (error) {
    console.error("Failed to list events", error);
    throw new InternalError("Failed to list events", error);
  }

  return data ?? [];
}

export async function getEventById(id: string): Promise<DbEvent | null> {
  const client = ensureClient();
  if (!id || !/^[0-9a-fA-F-]{36}$/.test(id)) {
    console.warn("Invalid event id provided", id);
    return null;
  }

  const { data, error } = await client
    .from<DbEvent>(table)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(`Failed to get event ${id}`, error);
    throw new InternalError("Failed to get event", error);
  }

  return data ? data : null;
}

export async function createEvent(payload: EventCreateInput): Promise<DbEvent> {
  const client = ensureClient();
  const now = new Date().toISOString();

  const insertPayload = {
    title: payload.title,
    description: payload.description,
    category: payload.category ?? null,
    date_time:
      payload.dateTime instanceof Date
        ? payload.dateTime.toISOString()
        : payload.dateTime,
    location_text: payload.locationText,
    location_lat: payload.locationLat ?? null,
    location_lng: payload.locationLng ?? null,
    max_participants: payload.maxParticipants ?? null,
    custom_fields_schema: payload.customFieldsSchema ?? [],
    created_by_user_id: payload.createdByUserId ?? null,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await client
    .from<DbEvent>(table)
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error("Failed to create event", error);
    throw new InternalError("Failed to create event", error);
  }

  return data;
}

export async function updateEvent(
  id: string,
  payload: EventUpdateInput
): Promise<DbEvent | null> {
  const client = ensureClient();
  const patch = {
    ...(payload.title !== undefined ? { title: payload.title } : {}),
    ...(payload.description !== undefined ? { description: payload.description } : {}),
    ...(payload.category !== undefined ? { category: payload.category } : {}),
    ...(payload.dateTime !== undefined
      ? {
          date_time:
            payload.dateTime instanceof Date
              ? payload.dateTime.toISOString()
              : payload.dateTime,
        }
      : {}),
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
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from<DbEvent>(table)
    .update(patch)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    console.error(`Failed to update event ${id}`, error);
    throw new InternalError("Failed to update event", error);
  }

  return data ?? null;
}

export async function deleteEvent(id: string): Promise<boolean> {
  const client = ensureClient();
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
