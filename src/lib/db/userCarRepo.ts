import { supabase, supabaseAdmin, ensureClient, ensureAdminClient } from "./client";
import type { UserCar, UserCarCreateInput } from "../types/userCar";
import type { Database } from "../types/supabase";
import { log } from "@/lib/utils/logger";

type DbUserCar = Database["public"]["Tables"]["user_cars"]["Row"];
type DbUserCarInsert = Database["public"]["Tables"]["user_cars"]["Insert"];
type DbUserCarUpdate = Database["public"]["Tables"]["user_cars"]["Update"];

/**
 * Mapper: DB → DTO
 */
function mapUserCar(row: DbUserCar): UserCar {
  return {
    id: row.id,
    userId: row.user_id,
    carBrandId: row.car_brand_id,
    type: row.type as UserCar["type"],
    plate: row.plate,
    color: row.color,
    isPrimary: row.is_primary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Получить все автомобили пользователя
 */
export async function getUserCars(userId: string): Promise<UserCar[]> {
  ensureAdminClient();
  if (!supabaseAdmin) return [];

  const { data, error } = await supabaseAdmin
    .from("user_cars")
    .select("*")
    .eq("user_id", userId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    log.error("Failed to get user cars", { userId, error });
    return [];
  }

  return (data || []).map(mapUserCar);
}

/**
 * Создать автомобиль
 */
export async function createUserCar(
  userId: string,
  input: UserCarCreateInput
): Promise<UserCar> {
  ensureAdminClient();
  if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");

  // Проверяем, есть ли у пользователя другие автомобили
  const existingCars = await getUserCars(userId);
  const isFirstCar = existingCars.length === 0;

  const insertData: DbUserCarInsert = {
    user_id: userId,
    car_brand_id: input.carBrandId,
    type: input.type,
    plate: input.plate || null,
    color: input.color || null,
    is_primary: isFirstCar,
  };

  const { data, error } = await supabaseAdmin
    .from("user_cars")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    log.error("Failed to create user car", { userId, input, error });
    // Include Supabase error details in the message for debugging
    const errorDetails = error.message || error.code || "Unknown error";
    throw new Error(`Не удалось создать автомобиль: ${errorDetails}`);
  }

  return mapUserCar(data);
}

/**
 * Удалить автомобиль
 */
export async function deleteUserCar(userId: string, carId: string): Promise<void> {
  ensureAdminClient();
  if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");

  // Check if this is the primary car
  const { data: carToDelete } = await supabaseAdmin
    .from("user_cars")
    .select("is_primary")
    .eq("id", carId)
    .eq("user_id", userId)
    .single();

  const wasPrimary = carToDelete?.is_primary || false;

  // Delete the car
  const { error } = await supabaseAdmin
    .from("user_cars")
    .delete()
    .eq("id", carId)
    .eq("user_id", userId);

  if (error) {
    log.error("Failed to delete user car", { userId, carId, error });
    throw new Error("Не удалось удалить автомобиль");
  }

  // If deleted car was primary, set the first remaining car as primary
  if (wasPrimary) {
    const remainingCars = await getUserCars(userId);
    if (remainingCars.length > 0) {
      await setPrimaryUserCar(userId, remainingCars[0].id);
    }
  }
}

/**
 * Обновить автомобиль
 */
export async function updateUserCar(
  userId: string,
  carId: string,
  input: UserCarCreateInput
): Promise<UserCar> {
  ensureAdminClient();
  if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");

  const updateData: DbUserCarUpdate = {
    car_brand_id: input.carBrandId,
    type: input.type,
    plate: input.plate || null,
    color: input.color || null,
  };

  const { data, error } = await supabaseAdmin
    .from("user_cars")
    .update(updateData)
    .eq("id", carId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    log.error("Failed to update user car", { userId, carId, input, error });
    const errorDetails = error.message || error.code || "Unknown error";
    throw new Error(`Не удалось обновить автомобиль: ${errorDetails}`);
  }

  if (!data) {
    throw new Error("Автомобиль не найден");
  }

  return mapUserCar(data);
}

/**
 * Установить основной автомобиль
 */
export async function setPrimaryUserCar(userId: string, carId: string): Promise<void> {
  ensureAdminClient();
  if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");

  // 1. Снять флаг is_primary со всех автомобилей пользователя
  const resetUpdate: DbUserCarUpdate = { is_primary: false };
  const { error: resetError } = await supabaseAdmin
    .from("user_cars")
    .update(resetUpdate)
    .eq("user_id", userId);

  if (resetError) {
    log.error("Failed to reset primary user car", { userId, error: resetError });
    throw new Error("Не удалось сбросить основной автомобиль");
  }

  // 2. Установить is_primary для выбранного автомобиля
  const setUpdate: DbUserCarUpdate = { is_primary: true };
  const { error: setError } = await supabaseAdmin
    .from("user_cars")
    .update(setUpdate)
    .eq("id", carId)
    .eq("user_id", userId);

  if (setError) {
    log.error("Failed to set primary user car", { userId, carId, error: setError });
    throw new Error("Не удалось установить основной автомобиль");
  }
}

/**
 * Получить основной автомобиль пользователя
 */
export async function getPrimaryUserCar(userId: string): Promise<UserCar | null> {
  ensureAdminClient();
  if (!supabaseAdmin) return null;

  const { data, error } = await supabaseAdmin
    .from("user_cars")
    .select("*")
    .eq("user_id", userId)
    .eq("is_primary", true)
    .single();

  if (error || !data) {
    return null;
  }

  return mapUserCar(data);
}
