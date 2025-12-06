import { supabase } from "@/lib/db/client";
import { InternalError } from "@/lib/errors";
import { User } from "@/lib/types/user";
import { Database } from "@/lib/types/supabase";

const table = "users" satisfies keyof Database["public"]["Tables"];
type DbUserRow = Database["public"]["Tables"]["users"]["Row"];

function ensureClient() {
  if (!supabase) {
    console.warn("Supabase client is not configured");
    return null;
  }
  return supabase;
}

function mapRowToUser(data: DbUserRow): User {
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

export async function ensureUserExists(id: string, name?: string): Promise<DbUserRow> {
  const client = ensureClient();
  if (!client) {
    throw new InternalError("Supabase client is not configured");
  }
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
    .from(table)
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("Failed to ensure user exists", error);
    throw new InternalError("Failed to ensure user exists", error);
  }

  return data as DbUserRow;
}

export async function getUserById(id: string): Promise<User | null> {
  const client = ensureClient();
  if (!client) return null;
  const { data, error } = await client.from(table).select("*").eq("id", id).maybeSingle();
  if (error) {
    console.error("Failed to fetch user", error);
    throw new InternalError("Failed to fetch user", error);
  }
  if (!data) return null;
  return mapRowToUser(data as DbUserRow);
}

export async function findUserByTelegramId(telegramId: string): Promise<User | null> {
  const client = ensureClient();
  if (!client) return null;
  const { data, error } = await client
    .from(table)
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (error) {
    console.error("Failed to find user by telegram id", error);
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
  const client = ensureClient();
  if (!client) {
    throw new InternalError("Supabase client is not configured");
  }
  const insertPayload = {
    name: payload.name,
    telegram_id: payload.telegramId,
    telegram_handle: payload.telegramHandle ?? null,
    avatar_url: payload.avatarUrl ?? null,
  };

  const { data, error } = await client
    .from(table)
    .upsert(insertPayload, { onConflict: "telegram_id" })
    .select("*")
    .single();

  if (error) {
    console.error("Failed to upsert telegram user", error);
    throw new InternalError("Failed to upsert telegram user", error);
  }

  return mapRowToUser(data as DbUserRow);
}
