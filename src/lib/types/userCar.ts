import { z } from "zod";
import { vehicleTypeIdSchema, type VehicleTypeId } from "./vehicleType";

/**
 * Car Type (uses vehicle_types from database)
 * @deprecated Use VehicleTypeId from vehicleType.ts
 */
export type CarType = VehicleTypeId;

/**
 * @deprecated Use getVehicleTypeOptions() from vehicleTypeRepo instead
 * This constant is kept for backward compatibility but should not be used in new code
 */
export const CAR_TYPES: { value: string; label: string }[] = [
  { value: "offroad", label: "Внедорожник" },
  { value: "sedan", label: "Седан" },
  { value: "suv", label: "Кроссовер" },
  { value: "sportcar", label: "Спорткар" },
  { value: "classic", label: "Классика" },
  { value: "other", label: "Другое" },
];

/**
 * Интерфейс автомобиля пользователя
 */
export interface UserCar {
  id: string;
  userId: string;
  carBrandId: string;
  type: CarType;
  plate: string | null;
  color: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Hydrated (опционально)
  carBrand?: {
    id: string;
    name: string;
    slug?: string | null;
  } | null;
}

/**
 * Схема для создания автомобиля
 * Now uses vehicle_types from database
 */
export const userCarCreateSchema = z.object({
  carBrandId: z.string().uuid("Выберите марку автомобиля"),
  type: vehicleTypeIdSchema, // From database
  plate: z.string().trim().max(20, "Макс 20 символов").optional().nullable(),
  color: z.string().trim().max(50, "Макс 50 символов").optional().nullable(),
});

/**
 * Схема для обновления автомобиля
 * Now uses vehicle_types from database
 */
export const userCarUpdateSchema = z.object({
  carBrandId: z.string().uuid("Выберите марку автомобиля").optional(),
  type: vehicleTypeIdSchema.optional(), // From database
  plate: z.string().trim().max(20, "Макс 20 символов").optional().nullable(),
  color: z.string().trim().max(50, "Макс 50 символов").optional().nullable(),
  isPrimary: z.boolean().optional(),
});

export type UserCarCreateInput = z.infer<typeof userCarCreateSchema>;
export type UserCarUpdateInput = z.infer<typeof userCarUpdateSchema>;

