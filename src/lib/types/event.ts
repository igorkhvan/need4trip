import { z } from "zod";

export const eventCategorySchema = z.enum([
  "weekend_trip",
  "technical_ride",
  "meeting",
  "training",
  "service_day",
  "other",
]);
export type EventCategory = z.infer<typeof eventCategorySchema>;

export const visibilitySchema = z.enum(["public", "link_registered"]);
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
  category: EventCategory | null;
  dateTime: string;
  locationText: string;
  locationLat: number | null;
  locationLng: number | null;
  maxParticipants: number | null;
  customFieldsSchema: EventCustomFieldSchemaItem[];
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  visibility: Visibility;
  vehicleTypeRequirement: VehicleTypeRequirement;
  allowedBrands: CarBrand[];
  rules?: string | null;
  isClubEvent: boolean;
  isPaid: boolean;
  price?: number | null;
  currency?: string | null;
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
    category: eventCategorySchema.nullable().optional(),
    dateTime: eventDateSchema,
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
    isPaid: z.boolean().default(false),
    price: z.number().finite().nonnegative().nullable().optional(),
    currency: z.string().trim().max(10).optional().nullable(),
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
  category: eventCategorySchema.nullable().optional(),
  dateTime: eventDateSchema.optional(),
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
  isPaid: z.boolean().optional(),
  price: z.number().finite().nonnegative().nullable().optional(),
  currency: z.string().trim().max(10).optional().nullable(),
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
