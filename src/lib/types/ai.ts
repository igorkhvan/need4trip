/**
 * AI Service Types
 * 
 * Types for AI-powered features (rules generation, etc.)
 */

import { z } from "zod";
import { 
  eventCustomFieldSchemaItem, 
  vehicleTypeRequirementSchema, 
  visibilitySchema 
} from "./event";

/**
 * Schema for AI rules generation request
 * Matches the event create/update payload structure
 */
export const generateRulesRequestSchema = z.object({
  // Event ID (optional, only for edit mode)
  eventId: z.string().uuid().optional(),
  
  // Basic info
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  
  // Date & Location
  dateTime: z.string(), // ISO 8601
  cityId: z.string().uuid().nullable(),
  locationText: z.string().min(1).max(500),
  
  // Participants
  maxParticipants: z.number().int().positive().nullable(),
  
  // Category & Vehicle
  categoryId: z.string().uuid(),
  vehicleTypeRequirement: vehicleTypeRequirementSchema,
  allowedBrandIds: z.array(z.string().uuid()).default([]),
  
  // Custom fields
  customFieldsSchema: z.array(eventCustomFieldSchemaItem).default([]),
  
  // Visibility
  visibility: visibilitySchema,
  
  // Club & Payment
  isClubEvent: z.boolean().default(false),
  isPaid: z.boolean().default(false),
  price: z.number().nonnegative().nullable().optional(),
  currencyCode: z.string().nullable().optional(),
  
  // Existing rules (optional, for context)
  rules: z.string().nullable().optional(),
});

export type GenerateRulesRequest = z.infer<typeof generateRulesRequestSchema>;

/**
 * Response from AI rules generation
 */
export interface GenerateRulesResponse {
  rulesText: string;
  // Optional: summary badges for critical requirements
  // summaryBadges?: string[];
}

/**
 * Resolved event data for AI prompt (human-readable)
 */
export interface ResolvedEventData {
  title: string;
  description: string | null;
  dateTime: string; // ISO format
  cityName: string | null;
  locationText: string;
  maxParticipants: number | null;
  categoryName: string;
  vehicleTypeLabel: string;
  allowedBrands: string[]; // Brand names
  customFields: Array<{
    label: string;
    type: string;
    required: boolean;
  }>;
  isPaid: boolean;
  price: number | null;
  currencyCode: string | null;
}
