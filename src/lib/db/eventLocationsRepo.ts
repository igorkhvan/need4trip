/**
 * Event Locations Repository
 * CRUD operations for event_locations table
 */

import { getAdminDb } from "./client";
import { log } from "@/lib/utils/logger";
import { InternalError } from "@/lib/errors";
import {
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
  const db = getAdminDb();

  const { data, error } = await db
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
 * Uses UPSERT strategy to avoid trigger conflicts with first location
 * 
 * Strategy:
 * 1. Delete locations that are NOT in the new list (except sort_order=1)
 * 2. UPSERT all locations (update existing, insert new)
 * 
 * This approach:
 * - Never deletes the first location (sort_order=1)
 * - Respects the database trigger that prevents first location deletion
 * - Minimizes unnecessary deletes/inserts
 */
export async function saveLocations(
  eventId: string,
  locations: EventLocationInput[]
): Promise<EventLocation[]> {
  const db = getAdminDb();

  // Validate: First location must exist
  const hasFirstLocation = locations.some((loc) => loc.sortOrder === 1);
  if (!hasFirstLocation) {
    throw new Error("First location (sort_order=1) is required");
  }

  // Step 1: Get existing locations
  const { data: existingLocations, error: fetchError } = await db
    .from(table)
    .select("*")
    .eq("event_id", eventId);

  if (fetchError) {
    log.error("Failed to fetch existing locations", { eventId, error: fetchError });
    throw new InternalError("Failed to fetch existing locations", fetchError);
  }

  // Step 2: Identify locations to delete (not in new list, excluding sort_order=1)
  const newSortOrders = new Set(locations.map(loc => loc.sortOrder));
  const toDelete = (existingLocations || [])
    .filter(loc => loc.sort_order !== 1 && !newSortOrders.has(loc.sort_order))
    .map(loc => loc.id);

  if (toDelete.length > 0) {
    const { error: deleteError } = await db
      .from(table)
      .delete()
      .in("id", toDelete);

    if (deleteError) {
      log.error("Failed to delete removed locations", { eventId, toDelete, error: deleteError });
      throw new InternalError("Failed to delete removed locations", deleteError);
    }

    log.info("Deleted removed locations", { eventId, count: toDelete.length });
  }

  // Step 3: UPSERT all locations (update existing, insert new)
  const dbLocations = locations.map((loc) =>
    mapDomainEventLocationToDb({ ...loc, eventId })
  );

  const { data, error: upsertError } = await db
    .from(table)
    .upsert(dbLocations, {
      onConflict: "event_id,sort_order", // Use unique constraint
      ignoreDuplicates: false, // Update on conflict
    })
    .select();

  if (upsertError) {
    log.error("Failed to upsert locations", { eventId, error: upsertError });
    throw new InternalError("Failed to upsert locations", upsertError);
  }

  if (!data) {
    throw new InternalError("No data returned after upsert");
  }

  log.info("Saved event locations", { eventId, count: data.length });

  return data.map((row: any) => mapDbEventLocationToDomain(row as DbEventLocation));
}

/**
 * Delete a single location (except first one)
 * Database trigger will prevent deletion of first location
 */
export async function deleteLocation(locationId: string): Promise<void> {
  const db = getAdminDb();

  const { error } = await db
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
  const db = getAdminDb();

  const dbUpdates: any = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.latitude !== undefined) dbUpdates.latitude = updates.latitude;
  if (updates.longitude !== undefined) dbUpdates.longitude = updates.longitude;
  if (updates.rawInput !== undefined) dbUpdates.raw_input = updates.rawInput;
  if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;

  const { data, error } = await db
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
  const db = getAdminDb();

  const defaultLocation: Omit<DbEventLocation, "id" | "created_at" | "updated_at"> = {
    event_id: eventId,
    sort_order: 1,
    title,
    latitude: null,
    longitude: null,
    raw_input: null,
  };

  const { data, error } = await db
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
  const db = getAdminDb();

  const { count, error } = await db
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  if (error) {
    log.error("Failed to get locations count", { eventId, error });
    throw new InternalError("Failed to get locations count", error);
  }

  return count ?? 0;
}
