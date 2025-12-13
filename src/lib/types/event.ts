import { z } from "zod";
import { CityHydrated } from "./city";
import { CurrencyHydrated } from "./currency";
import { EventCategoryDto } from "./eventCategory";

// Legacy enum - kept for backward compatibility during migration
// Will be removed after full migration to event_categories table
export const eventCategoryLegacySchema = z.enum([
  "weekend_trip",
  "technical_ride",
  "meeting",
  "training",
  "service_day",
  "other",
]);
export type EventCategoryLegacy = z.infer<typeof eventCategoryLegacySchema>;

// Event visibility levels (updated to match DB schema)
export const visibilitySchema = z.enum(["public", "unlisted", "restricted"]);
export type Visibility = z.infer<typeof visibilitySchema>;

export const vehicleTypeRequirementSchema = z.enum(["any", "sedan", "crossover", "suv"]);
export type VehicleTypeRequirement = z.infer<typeof vehicleTypeRequirementSchema>;

export interface CarBrand {
  id: string;
  name: string;
  slug?: string | null;
}

export const eventCustomFieldTypeSchema = z.enum([
  "boolean",
  "text",
  "number",
  "enum",
]);
export type EventCustomFieldType = z.infer<typeof eventCustomFieldTypeSchema>;

export const eventCustomFieldSchemaItem = z
  .object({
    id: z.string().min(1, "id is required"),
    type: eventCustomFieldTypeSchema,
    label: z.string().trim().min(1, "label is required"),
    order: z.number().int().min(1, "order must be >= 1"),
    options: z.array(z.string().trim().min(1)).default([]),
    required: z.boolean(),
  })
  .superRefine((val, ctx) => {
    if (val.type === "enum") {
      if (!val.options || val.options.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "enum fields must provide non-empty options",
          path: ["options"],
        });
      }
    } else if (val.options && val.options.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "options must be empty for non-enum fields",
        path: ["options"],
      });
    }
  });

export type EventCustomFieldSchemaItem = z.infer<typeof eventCustomFieldSchemaItem>;
export type EventCustomFieldsSchema = EventCustomFieldSchemaItem[];
export type EventCustomFieldSchema = EventCustomFieldSchemaItem; // backward compatibility

export const eventCustomFieldsSchema = z
  .array(eventCustomFieldSchemaItem)
  .superRefine((fields, ctx) => {
    const seen = new Set<string>();
    fields.forEach((field, index) => {
      if (seen.has(field.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate custom field id: ${field.id}`,
          path: [index, "id"],
        });
      }
      seen.add(field.id);
    });
  });

export type EventCustomFieldValue = string | number | boolean | null;
export type EventCustomFieldValues = Record<string, EventCustomFieldValue>;

export interface Event {
  id: string;
  title: string;
  description: string;
  categoryId: string | null; // FK to event_categories
  category?: EventCategoryDto | null; // Hydrated category info
  dateTime: string;
  cityId: string | null; // FK на cities table (обязательно при создании, но может быть null для старых записей)
  city?: CityHydrated | null; // Hydrated city info
  locationText: string;
  locationLat: number | null;
  locationLng: number | null;
  maxParticipants: number | null;
  customFieldsSchema: EventCustomFieldSchemaItem[];
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  visibility: Visibility;
  vehicleTypeRequirement: VehicleTypeRequirement;
  allowedBrands: CarBrand[];
  rules?: string | null;
  isClubEvent: boolean;
  clubId?: string | null; // ID клуба-организатора (NULL = личное событие)
  club?: {  // Hydrated club info (опционально)
    id: string;
    name: string;
    logoUrl: string | null;
  } | null;
  isPaid: boolean;
  price?: number | null;
  currencyCode?: string | null; // ISO 4217 code (normalized)
  currency?: CurrencyHydrated | null; // Hydrated currency info
  participantsCount?: number;
  ownerName?: string | null;
  ownerHandle?: string | null;
}

export type DomainEvent = Event;

const date5MinutesAgo = () => new Date(Date.now() - 5 * 60 * 1000);

const eventDateSchema = z.preprocess((val) => {
  if (val instanceof Date) return val;
  if (typeof val === "string" || typeof val === "number") {
    const d = new Date(val);
    return d;
  }
  return val;
}, z.date({ invalid_type_error: "dateTime must be a valid date" }));

export const eventCreateSchema = z
  .object({
    title: z.string().trim().min(3).max(150),
    description: z.string().trim().min(1).max(5000),
    categoryId: z.string().uuid().nullable().optional(), // Changed from category enum
    dateTime: eventDateSchema,
    cityId: z.string().uuid(), // FK на cities table (обязательное поле)
    locationText: z.string().trim().min(1),
    locationLat: z.number().finite().nullable().optional(),
    locationLng: z.number().finite().nullable().optional(),
    maxParticipants: z.number().int().min(1).max(500).nullable().optional(),
    customFieldsSchema: eventCustomFieldsSchema.default([]),
    createdByUserId: z.string().uuid().optional().nullable(),
    visibility: visibilitySchema.default("public"),
    vehicleTypeRequirement: vehicleTypeRequirementSchema.default("any"),
    allowedBrandIds: z.array(z.string().uuid()).default([]),
    rules: z.string().trim().max(10000).optional().nullable(),
    isClubEvent: z.boolean().default(false),
    clubId: z.string().uuid().nullable().optional(), // ID клуба-организатора
    isPaid: z.boolean().default(false),
    price: z.number().finite().nonnegative().nullable().optional(),
    currencyCode: z.string().length(3).toUpperCase().nullable().optional(), // ISO 4217 code (normalized)
  })
  .superRefine((val, ctx) => {
    if (val.dateTime <= date5MinutesAgo()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "dateTime must be in the future",
        path: ["dateTime"],
      });
    }
  });

const eventUpdateBaseSchema = z.object({
  title: z.string().trim().min(3).max(150).optional(),
  description: z.string().trim().min(1).max(5000).optional(),
  categoryId: z.string().uuid().nullable().optional(), // Changed from category enum
  dateTime: eventDateSchema.optional(),
  cityId: z.string().uuid().optional(), // FK на cities table (обязательное при передаче)
  locationText: z.string().trim().min(1).optional(),
  locationLat: z.number().finite().nullable().optional(),
  locationLng: z.number().finite().nullable().optional(),
  maxParticipants: z.number().int().min(1).max(500).nullable().optional(),
  customFieldsSchema: eventCustomFieldsSchema.optional(),
  createdByUserId: z.string().uuid().optional().nullable(),
  visibility: visibilitySchema.optional(),
  vehicleTypeRequirement: vehicleTypeRequirementSchema.optional(),
  allowedBrandIds: z.array(z.string().uuid()).optional(),
  rules: z.string().trim().max(10000).optional().nullable(),
    isClubEvent: z.boolean().optional(),
    clubId: z.string().uuid().nullable().optional(),
    isPaid: z.boolean().optional(),
    price: z.number().finite().nonnegative().nullable().optional(),
    currencyCode: z.string().length(3).toUpperCase().nullable().optional(), // ISO 4217 code (normalized)
});

export const eventUpdateSchema = eventUpdateBaseSchema.superRefine((val, ctx) => {
  if (val.dateTime && val.dateTime <= date5MinutesAgo()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "dateTime must be in the future",
      path: ["dateTime"],
    });
  }
});

export type EventCreateInput = z.infer<typeof eventCreateSchema>;
export type EventUpdateInput = z.infer<typeof eventUpdateSchema>;
