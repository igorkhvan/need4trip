import { supabase } from "@/lib/db/client";
import { InternalError } from "@/lib/errors";
import { User } from "@/lib/types/user";

const table = "users";

function ensureClient() {
  if (!supabase) {
    throw new InternalError("Supabase client is not configured");
  }
  return supabase;
}

interface DbUser {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  telegram_handle: string | null;
  telegram_id: string | null;
  avatar_url: string | null;
  car_model: string | null;
  experience_level: User["experienceLevel"] | null;
  created_at: string;
  updated_at: string;
}

export async function ensureUserExists(id: string, name?: string): Promise<DbUser> {
  const client = ensureClient();
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

  const { data, error } = await client
    .from<DbUser>(table)
    .upsert(payload, { onConflict: "id" })
    .select()
    .maybeSingle();

  if (error) {
    console.error("Failed to ensure user exists", error);
    throw new InternalError("Failed to ensure user exists", error);
  }

  return data as DbUser;
}

export async function getUserById(id: string): Promise<User | null> {
  const client = ensureClient();
  const { data, error } = await client.from<DbUser>(table).select("*").eq("id", id).maybeSingle();
  if (error) {
    console.error("Failed to fetch user", error);
    throw new InternalError("Failed to fetch user", error);
  }
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    phone: data.phone,
    email: data.email,
    telegramHandle: data.telegram_handle,
    telegramId: data.telegram_id,
    avatarUrl: data.avatar_url,
    carModel: data.car_model,
    experienceLevel: data.experience_level,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function findUserByTelegramId(telegramId: string): Promise<User | null> {
  const client = ensureClient();
  const { data, error } = await client
    .from<DbUser>(table)
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (error) {
    console.error("Failed to find user by telegram id", error);
    throw new InternalError("Failed to find user by telegram id", error);
  }

  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    phone: data.phone,
    email: data.email,
    telegramHandle: data.telegram_handle,
    telegramId: data.telegram_id,
    avatarUrl: data.avatar_url,
    carModel: data.car_model,
    experienceLevel: data.experience_level,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function upsertTelegramUser(payload: {
  telegramId: string;
  name: string;
  telegramHandle?: string | null;
  avatarUrl?: string | null;
}): Promise<User> {
  const client = ensureClient();
  const insertPayload = {
    name: payload.name,
    telegram_id: payload.telegramId,
    telegram_handle: payload.telegramHandle ?? null,
    avatar_url: payload.avatarUrl ?? null,
  };

  const { data, error } = await client
    .from<DbUser>(table)
    .upsert(insertPayload, { onConflict: "telegram_id" })
    .select()
    .single();

  if (error) {
    console.error("Failed to upsert telegram user", error);
    throw new InternalError("Failed to upsert telegram user", error);
  }

  return {
    id: data.id,
    name: data.name,
    phone: data.phone,
    email: data.email,
    telegramHandle: data.telegram_handle,
    telegramId: data.telegram_id,
    avatarUrl: data.avatar_url,
    carModel: data.car_model,
    experienceLevel: data.experience_level,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
