/**
 * Event Locations Repository
 * CRUD operations for event_locations table
 */

import { ensureClient } from "./client";
import { log } from "@/lib/logger";
import { InternalError } from "@/lib/errors/InternalError";
import type {
  EventLocation,
  DbEventLocation,
  EventLocationInput,
  mapDbEventLocationToDomain,
  mapDomainEventLocationToDb,
} from "@/lib/types/eventLocation";

const table = "event_locations";

/**
 * Get all locations for an event (sorted by sort_order)
 */
export async function getLocationsByEventId(eventId: string): Promise<EventLocation[]> {
  ensureClient();
  const { supabase } = await import("./client");
  
  if (!supabase) {
    throw new InternalError("Supabase client is not configured");
  }

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  if (error) {
    log.error("Failed to get event locations", { eventId, error });
    throw new InternalError("Failed to get event locations", error);
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data.map((row: any) => mapDbEventLocationToDomain(row as DbEventLocation));
}

/**
 * Save locations for an event
 * Replaces all existing locations with new ones (upsert strategy)
 */
export async function saveLocations(
  eventId: string,
  locations: EventLocationInput[]
): Promise<EventLocation[]> {
  ensureClient();
  const { supabaseAdmin } = await import("./client");
  
  if (!supabaseAdmin) {
    throw new InternalError("Supabase admin client is not configured");
  }

  // Validate: First location must exist
  const hasFirstLocation = locations.some((loc) => loc.sortOrder === 1);
  if (!hasFirstLocation) {
    throw new Error("First location (sort_order=1) is required");
  }

  // Step 1: Delete all existing locations for this event
  const { error: deleteError } = await supabaseAdmin
    .from(table)
    .delete()
    .eq("event_id", eventId);

  if (deleteError) {
    log.error("Failed to delete old locations", { eventId, error: deleteError });
    throw new InternalError("Failed to delete old locations", deleteError);
  }

  // Step 2: Insert new locations
  const dbLocations = locations.map((loc) =>
    mapDomainEventLocationToDb({ ...loc, eventId })
  );

  const { data, error: insertError } = await supabaseAdmin
    .from(table)
    .insert(dbLocations)
    .select();

  if (insertError) {
    log.error("Failed to insert new locations", { eventId, error: insertError });
    throw new InternalError("Failed to insert new locations", insertError);
  }

  if (!data) {
    throw new InternalError("No data returned after insert");
  }

  log.info("Saved event locations", { eventId, count: data.length });

  return data.map((row: any) => mapDbEventLocationToDomain(row as DbEventLocation));
}

/**
 * Delete a single location (except first one)
 * Database trigger will prevent deletion of first location
 */
export async function deleteLocation(locationId: string): Promise<void> {
  ensureClient();
  const { supabaseAdmin } = await import("./client");
  
  if (!supabaseAdmin) {
    throw new InternalError("Supabase admin client is not configured");
  }

  const { error } = await supabaseAdmin
    .from(table)
    .delete()
    .eq("id", locationId);

  if (error) {
    // Check if it's the trigger preventing deletion
    if (error.message?.includes("Cannot delete the first location")) {
      throw new Error("Первая точка не может быть удалена. События должны иметь как минимум одну точку.");
    }
    
    log.error("Failed to delete location", { locationId, error });
    throw new InternalError("Failed to delete location", error);
  }

  log.info("Deleted location", { locationId });
}

/**
 * Update a single location
 */
export async function updateLocation(
  locationId: string,
  updates: Partial<EventLocationInput>
): Promise<EventLocation> {
  ensureClient();
  const { supabaseAdmin } = await import("./client");
  
  if (!supabaseAdmin) {
    throw new InternalError("Supabase admin client is not configured");
  }

  const dbUpdates: any = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.latitude !== undefined) dbUpdates.latitude = updates.latitude;
  if (updates.longitude !== undefined) dbUpdates.longitude = updates.longitude;
  if (updates.rawInput !== undefined) dbUpdates.raw_input = updates.rawInput;
  if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;

  const { data, error } = await supabaseAdmin
    .from(table)
    .update(dbUpdates)
    .eq("id", locationId)
    .select()
    .single();

  if (error) {
    log.error("Failed to update location", { locationId, error });
    throw new InternalError("Failed to update location", error);
  }

  if (!data) {
    throw new InternalError("No data returned after update");
  }

  log.info("Updated location", { locationId });

  return mapDbEventLocationToDomain(data as DbEventLocation);
}

/**
 * Create default first location for an event
 */
export async function createDefaultLocation(
  eventId: string,
  title: string = "Точка сбора"
): Promise<EventLocation> {
  ensureClient();
  const { supabaseAdmin } = await import("./client");
  
  if (!supabaseAdmin) {
    throw new InternalError("Supabase admin client is not configured");
  }

  const defaultLocation: Omit<DbEventLocation, "id" | "created_at" | "updated_at"> = {
    event_id: eventId,
    sort_order: 1,
    title,
    latitude: null,
    longitude: null,
    raw_input: null,
  };

  const { data, error } = await supabaseAdmin
    .from(table)
    .insert(defaultLocation)
    .select()
    .single();

  if (error) {
    log.error("Failed to create default location", { eventId, error });
    throw new InternalError("Failed to create default location", error);
  }

  if (!data) {
    throw new InternalError("No data returned after creating default location");
  }

  log.info("Created default location", { eventId });

  return mapDbEventLocationToDomain(data as DbEventLocation);
}

/**
 * Get count of locations for an event
 */
export async function getLocationsCount(eventId: string): Promise<number> {
  ensureClient();
  const { supabase } = await import("./client");
  
  if (!supabase) {
    throw new InternalError("Supabase client is not configured");
  }

  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  if (error) {
    log.error("Failed to get locations count", { eventId, error });
    throw new InternalError("Failed to get locations count", error);
  }

  return count ?? 0;
}
