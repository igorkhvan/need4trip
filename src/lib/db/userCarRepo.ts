import { supabase, ensureClient } from "./client";
import type { UserCar, UserCarCreateInput } from "../types/userCar";

/**
 * Mapper: DB → DTO
 */
function mapUserCar(row: any): UserCar {
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
  ensureClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("user_cars")
    .select("*")
    .eq("user_id", userId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[getUserCars] Error:", error);
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
  ensureClient();
  if (!supabase) throw new Error("Supabase client not initialized");

  // Проверяем, есть ли у пользователя другие автомобили
  const existingCars = await getUserCars(userId);
  const isFirstCar = existingCars.length === 0;

  const insertData = {
    user_id: userId,
    car_brand_id: input.carBrandId,
    type: input.type,
    plate: input.plate || null,
    color: input.color || null,
    is_primary: isFirstCar, // Первый автомобиль автоматически основной
  };

  // @ts-ignore - user_cars table types not yet generated
  const { data, error } = await supabase
    .from("user_cars")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("[createUserCar] Error:", error);
    throw new Error("Не удалось создать автомобиль");
  }

  return mapUserCar(data);
}

/**
 * Удалить автомобиль
 */
export async function deleteUserCar(userId: string, carId: string): Promise<void> {
  ensureClient();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { error } = await supabase
    .from("user_cars")
    .delete()
    .eq("id", carId)
    .eq("user_id", userId); // Проверка владельца

  if (error) {
    console.error("[deleteUserCar] Error:", error);
    throw new Error("Не удалось удалить автомобиль");
  }
}

/**
 * Установить основной автомобиль
 */
export async function setPrimaryUserCar(userId: string, carId: string): Promise<void> {
  ensureClient();
  if (!supabase) throw new Error("Supabase client not initialized");

  // 1. Снять флаг is_primary со всех автомобилей пользователя
  const resetUpdate = { is_primary: false };
  // @ts-ignore - user_cars table types not yet generated
  const { error: resetError } = await supabase
    .from("user_cars")
    .update(resetUpdate)
    .eq("user_id", userId);

  if (resetError) {
    console.error("[setPrimaryUserCar] Reset error:", resetError);
    throw new Error("Не удалось сбросить основной автомобиль");
  }

  // 2. Установить is_primary для выбранного автомобиля
  const setUpdate = { is_primary: true };
  // @ts-ignore - user_cars table types not yet generated
  const { error: setError } = await supabase
    .from("user_cars")
    .update(setUpdate)
    .eq("id", carId)
    .eq("user_id", userId);

  if (setError) {
    console.error("[setPrimaryUserCar] Set error:", setError);
    throw new Error("Не удалось установить основной автомобиль");
  }
}

/**
 * Получить основной автомобиль пользователя
 */
export async function getPrimaryUserCar(userId: string): Promise<UserCar | null> {
  ensureClient();
  if (!supabase) return null;

  const { data, error } = await supabase
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

