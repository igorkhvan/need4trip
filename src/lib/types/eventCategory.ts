import { z } from "zod";

/**
 * Event Category - normalized table
 */
export interface EventCategory {
  id: string;
  code: string;
  nameRu: string;
  nameEn: string;
  icon: string;
  displayOrder: number;
  isActive: boolean;
  isDefault: boolean; // Added: indicates default category
  createdAt: string;
  updatedAt: string;
}

export const eventCategorySchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  nameRu: z.string(),
  nameEn: z.string(),
  icon: z.string(),
  displayOrder: z.number(),
  isActive: z.boolean(),
  isDefault: z.boolean(), // Added
  createdAt: z.string(),
  updatedAt: z.string(),
});

// For API responses and client-side usage
export type EventCategoryDto = Pick<EventCategory, "id" | "code" | "nameRu" | "nameEn" | "icon" | "isDefault">;

