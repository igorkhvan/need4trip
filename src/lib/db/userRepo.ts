import { supabase, ensureClient } from "@/lib/db/client";
import { InternalError } from "@/lib/errors";
import { User, ExperienceLevel } from "@/lib/types/user";
import { Database } from "@/lib/types/supabase";
import { log } from "@/lib/utils/logger";

const table = "users" satisfies keyof Database["public"]["Tables"];
type DbUserRow = Database["public"]["Tables"]["users"]["Row"];


function mapRowToUser(data: DbUserRow): User {
  return {
    id: data.id,
    name: data.name,
    phone: data.phone,
    email: data.email,
    telegramHandle: data.telegram_handle,
    telegramId: data.telegram_id,
    avatarUrl: data.avatar_url,
    cityId: data.city_id ?? null,
    carBrandId: data.car_brand_id ?? null,
    carModelText: data.car_model_text ?? null,
    experienceLevel: data.experience_level as ExperienceLevel | null,
    plan: (data.plan as "free" | "pro") ?? "free",
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function ensureUserExists(id: string, name?: string): Promise<DbUserRow> {
  ensureClient();
  if (!supabase) {
    throw new InternalError("Supabase client is not configured");
  }
  
  // 1. Проверяем существует ли пользователь
  const { data: existing, error: findError } = await supabase
    .from(table)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (findError) {
    log.error("Failed to check if user exists", { userId: id, error: findError });
    throw new InternalError("Failed to check if user exists", findError);
  }

  // 2. Если пользователь существует - возвращаем его (НЕ обновляем)
  if (existing) {
    return existing as DbUserRow;
  }

  // 3. Если пользователя нет - создаем нового (только для dev/тестов)
  const payload = {
    id,
    name: name?.trim() || "Dev User",
    phone: null,
    email: null,
    telegram_handle: null,
    telegram_id: null,
    avatar_url: null,
    car_model: null,
    experience_level: null,
  };

  const { data, error } = await supabase
    .from(table)
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    log.error("Failed to create user", { userId: id, error });
    throw new InternalError("Failed to create user", error);
  }

  log.debug("Created new user in dev mode", { userId: id, name });
  return data as DbUserRow;
}

export async function getUserById(id: string): Promise<User | null> {
  ensureClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
  if (error) {
    log.error("Failed to fetch user", { userId: id, error });
    throw new InternalError("Failed to fetch user", error);
  }
  if (!data) return null;
  return mapRowToUser(data as DbUserRow);
}

export async function findUserByTelegramId(telegramId: string): Promise<User | null> {
  ensureClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (error) {
    log.error("Failed to find user by telegram id", { telegramId, error });
    throw new InternalError("Failed to find user by telegram id", error);
  }

  if (!data) return null;
  return mapRowToUser(data as DbUserRow);
}

export async function upsertTelegramUser(payload: {
  telegramId: string;
  name: string;
  telegramHandle?: string | null;
  avatarUrl?: string | null;
}): Promise<User> {
  ensureClient();
  if (!supabase) {
    throw new InternalError("Supabase client is not configured");
  }
  const insertPayload = {
    name: payload.name,
    telegram_id: payload.telegramId,
    telegram_handle: payload.telegramHandle ?? null,
    avatar_url: payload.avatarUrl ?? null,
  };

  const { data, error } = await supabase
    .from(table)
    .upsert(insertPayload, { onConflict: "telegram_id" })
    .select("*")
    .single();

  if (error) {
    log.error("Failed to upsert telegram user", { telegramId: payload.telegramId, error });
    throw new InternalError("Failed to upsert telegram user", error);
  }

  return mapRowToUser(data as DbUserRow);
}

/**
 * Update user profile
 */
export async function updateUser(
  id: string,
  updates: {
    name?: string;
    cityId?: string;
    carBrandId?: string | null;
    carModelText?: string | null;
  }
): Promise<User> {
  ensureClient();
  if (!supabase) {
    throw new InternalError("Supabase client is not configured");
  }

  const patch: any = {};
  
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.cityId !== undefined) patch.city_id = updates.cityId;
  if (updates.carBrandId !== undefined) patch.car_brand_id = updates.carBrandId;
  if (updates.carModelText !== undefined) patch.car_model_text = updates.carModelText;
  
  const { data, error } = await supabase
    .from(table)
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    log.error("Failed to update user", { userId: id, error });
    throw new InternalError("Failed to update user", error);
  }

  return mapRowToUser(data as DbUserRow);
}
