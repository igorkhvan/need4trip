import { z } from "zod";

/**
 * Vehicle Type (from database)
 * Used for both user cars and event requirements
 */
export interface VehicleType {
  id: string;          // offroad, sedan, suv, sportcar, classic, other
  nameEn: string;      // English name
  nameRu: string;      // Russian name for UI
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Vehicle Type ID enum (for validation)
 * Must match database entries
 */
export const vehicleTypeIds = [
  "offroad",
  "sedan", 
  "suv",
  "sportcar",
  "classic",
  "other",
] as const;

export type VehicleTypeId = typeof vehicleTypeIds[number];

/**
 * Zod schema for vehicle type ID
 */
export const vehicleTypeIdSchema = z.enum(vehicleTypeIds, {
  errorMap: () => ({ message: "Выберите тип автомобиля" }),
});

/**
 * Vehicle Type DTO (database row)
 */
export interface DbVehicleType {
  id: string;
  name_en: string;
  name_ru: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
