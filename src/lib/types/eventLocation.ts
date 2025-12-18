import { z } from "zod";

/**
 * Event Location Type
 * Represents a single location point for an event
 */
export interface EventLocation {
  id: string;
  eventId: string;
  sortOrder: number;
  title: string;
  latitude: number | null;
  longitude: number | null;
  rawInput: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database representation (snake_case)
 */
export interface DbEventLocation {
  id: string;
  event_id: string;
  sort_order: number;
  title: string;
  latitude: number | null;
  longitude: number | null;
  raw_input: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Coordinate validation schema
 */
export const coordinateSchema = z.object({
  lat: z.number().min(-90, "Latitude must be >= -90").max(90, "Latitude must be <= 90"),
  lng: z.number().min(-180, "Longitude must be >= -180").max(180, "Longitude must be <= 180"),
});

export type Coordinate = z.infer<typeof coordinateSchema>;

/**
 * Event Location validation schema (for API input)
 */
export const eventLocationInputSchema = z.object({
  id: z.string().uuid().optional(), // Optional for new locations
  sortOrder: z.number().int().positive("Sort order must be positive"),
  title: z.string().trim().min(1, "Title is required").max(200, "Title too long"),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  rawInput: z.string().nullable().optional(),
});

export type EventLocationInput = z.infer<typeof eventLocationInputSchema>;

/**
 * Array of locations validation
 */
export const eventLocationsArraySchema = z
  .array(eventLocationInputSchema)
  .min(1, "At least one location is required")
  .superRefine((locations, ctx) => {
    // Ensure sort_order is unique
    const orders = locations.map((loc) => loc.sortOrder);
    const uniqueOrders = new Set(orders);
    if (orders.length !== uniqueOrders.size) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duplicate sort_order values are not allowed",
      });
    }

    // Ensure first location exists
    const hasFirstLocation = locations.some((loc) => loc.sortOrder === 1);
    if (!hasFirstLocation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "First location (sort_order=1) is required",
      });
    }
  });

/**
 * Mapper: DB -> Domain
 */
export function mapDbEventLocationToDomain(db: DbEventLocation): EventLocation {
  return {
    id: db.id,
    eventId: db.event_id,
    sortOrder: db.sort_order,
    title: db.title,
    latitude: db.latitude,
    longitude: db.longitude,
    rawInput: db.raw_input,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

/**
 * Mapper: Domain -> DB
 */
export function mapDomainEventLocationToDb(domain: EventLocationInput & { eventId: string }): Omit<DbEventLocation, 'id' | 'created_at' | 'updated_at'> {
  return {
    event_id: domain.eventId,
    sort_order: domain.sortOrder,
    title: domain.title,
    latitude: domain.latitude,
    longitude: domain.longitude,
    raw_input: domain.rawInput ?? null,
  };
}
