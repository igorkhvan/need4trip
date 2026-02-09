import { getAdminDb } from "@/lib/db/client";
import { InternalError } from "@/lib/errors";
import { User, ExperienceLevel, UserStatus } from "@/lib/types/user";
import { Database } from "@/lib/db/types";
import { log } from "@/lib/utils/logger";

const table = "users" satisfies keyof Database["public"]["Tables"];
type DbUserRow = Database["public"]["Tables"]["users"]["Row"];


function mapRowToUser(data: DbUserRow): User {
  return {
    id: data.id,
    name: data.name,
    phone: data.phone,
    email: data.email,
    bio: data.bio,
    telegramHandle: data.telegram_handle,
    telegramId: data.telegram_id,
    avatarUrl: data.avatar_url,
    cityId: data.city_id ?? null,
    carBrandId: data.car_brand_id ?? null,
    carModelText: data.car_model_text ?? null,
    experienceLevel: data.experience_level as ExperienceLevel | null,
    plan: (data.plan as "free" | "pro") ?? "free",
    status: (data.status as "active" | "suspended") ?? "active",
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function ensureUserExists(id: string, name?: string): Promise<DbUserRow> {
  const db = getAdminDb();
  
  // 1. Проверяем существует ли пользователь
  const { data: existing, error: findError } = await db
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

  const { data, error } = await db
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
  const db = getAdminDb();
  const { data, error } = await db.from(table).select("*").eq("id", id).maybeSingle();
  if (error) {
    log.error("Failed to fetch user", { userId: id, error });
    throw new InternalError("Failed to fetch user", error);
  }
  if (!data) return null;
  return mapRowToUser(data as DbUserRow);
}

/**
 * Get available credits count for a user
 * Used by getCurrentUser() to populate CurrentUser.availableCreditsCount
 */
export async function getAvailableCreditsCount(userId: string): Promise<number> {
  const db = getAdminDb();
  const { count, error } = await db
    .from("billing_credits")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "available");

  if (error) {
    log.error("Failed to fetch available credits count", { userId, error });
    // Don't throw - return 0 as fallback (non-critical data)
    return 0;
  }

  return count ?? 0;
}

export async function findUserByTelegramId(telegramId: string): Promise<User | null> {
  const db = getAdminDb();
  const { data, error } = await db
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
  const db = getAdminDb();
  const insertPayload = {
    name: payload.name,
    telegram_id: payload.telegramId,
    telegram_handle: payload.telegramHandle ?? null,
    avatar_url: payload.avatarUrl ?? null,
  };

  const { data, error } = await db
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
    email?: string | null;
    bio?: string | null;
    phone?: string | null;
    cityId?: string | null;
    carBrandId?: string | null;
    carModelText?: string | null;
  }
): Promise<User> {
  const db = getAdminDb();
  
  const patch: any = {};
  
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.email !== undefined) patch.email = updates.email;
  if (updates.bio !== undefined) patch.bio = updates.bio;
  if (updates.phone !== undefined) patch.phone = updates.phone;
  if (updates.cityId !== undefined) patch.city_id = updates.cityId;
  if (updates.carBrandId !== undefined) patch.car_brand_id = updates.carBrandId;
  if (updates.carModelText !== undefined) patch.car_model_text = updates.carModelText;
  
  const { data, error } = await db
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

// ============================================================================
// User Status Management (Admin)
// ============================================================================

/**
 * Update user account status (active ↔ suspended).
 * Used exclusively by admin endpoints.
 * 
 * @param userId - Target user ID
 * @param status - New status ('active' | 'suspended')
 * @returns Updated user
 */
export async function updateUserStatus(
  userId: string,
  status: UserStatus
): Promise<User> {
  const db = getAdminDb();

  const { data, error } = await db
    .from(table)
    .update({ status })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) {
    log.error("Failed to update user status", { userId, status, error });
    throw new InternalError("Failed to update user status", error);
  }

  return mapRowToUser(data as DbUserRow);
}

/**
 * Batch-fetch user statuses for a list of user IDs.
 * One query for N users. Used by abuse dashboard RSC page.
 * 
 * @param userIds - Array of user IDs
 * @returns Map of userId → status
 */
export async function batchGetUserStatuses(
  userIds: string[]
): Promise<Map<string, UserStatus>> {
  const result = new Map<string, UserStatus>();
  if (userIds.length === 0) return result;

  const db = getAdminDb();

  const { data, error } = await db
    .from(table)
    .select("id, status")
    .in("id", userIds);

  if (error) {
    log.error("Failed to batch fetch user statuses", { count: userIds.length, error });
    // Graceful degradation: return empty map, not throw
    return result;
  }

  for (const row of data ?? []) {
    result.set(row.id, (row.status as UserStatus) ?? "active");
  }

  return result;
}
