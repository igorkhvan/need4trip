import { z } from "zod";

/**
 * Типы автомобилей
 */
export type CarType = 
  | "offroad"    // Внедорожник
  | "sedan"      // Седан
  | "suv"        // Кроссовер
  | "sportcar"   // Спорткар
  | "classic"    // Классика
  | "other";     // Другое

export const CAR_TYPES: { value: CarType; label: string }[] = [
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
    slug: string | null;
  } | null;
}

/**
 * Схема для создания автомобиля
 */
export const userCarCreateSchema = z.object({
  carBrandId: z.string().uuid("Выберите марку автомобиля"),
  type: z.enum(["offroad", "sedan", "suv", "sportcar", "classic", "other"], {
    errorMap: () => ({ message: "Выберите тип автомобиля" }),
  }),
  plate: z.string().trim().max(20, "Макс 20 символов").optional().nullable(),
  color: z.string().trim().max(50, "Макс 50 символов").optional().nullable(),
});

/**
 * Схема для обновления автомобиля
 */
export const userCarUpdateSchema = z.object({
  carBrandId: z.string().uuid("Выберите марку автомобиля").optional(),
  type: z.enum(["offroad", "sedan", "suv", "sportcar", "classic", "other"]).optional(),
  plate: z.string().trim().max(20, "Макс 20 символов").optional().nullable(),
  color: z.string().trim().max(50, "Макс 50 символов").optional().nullable(),
  isPrimary: z.boolean().optional(),
});

export type UserCarCreateInput = z.infer<typeof userCarCreateSchema>;
export type UserCarUpdateInput = z.infer<typeof userCarUpdateSchema>;

