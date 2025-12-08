import crypto from "crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { setAuthCookie } from "@/lib/auth/cookies";
import { createAuthToken } from "@/lib/auth/currentUser";

export const dynamic = "force-dynamic";

type TelegramPayload = {
  id: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number | string;
  hash: string;
};

type AuthEnv = {
  botToken: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
  jwtSecret: string;
};

// In-memory replay cache per instance to mitigate repeated payloads
const usedTelegramPayloads = new Map<string, number>();
const MAX_PAYLOAD_AGE_SECONDS = 10 * 60; // 10 minutes
const ALLOWED_FUTURE_SKEW_SECONDS = 5 * 60;

function pruneReplayCache(nowSeconds: number) {
  for (const [key, ts] of usedTelegramPayloads.entries()) {
    if (ts < nowSeconds - MAX_PAYLOAD_AGE_SECONDS) {
      usedTelegramPayloads.delete(key);
    }
  }
}

function isReplay(payload: TelegramPayload): boolean {
  const nowSeconds = Math.floor(Date.now() / 1000);
  pruneReplayCache(nowSeconds);
  const key = `${payload.id}:${payload.auth_date}:${payload.hash}`;
  if (usedTelegramPayloads.has(key)) return true;
  usedTelegramPayloads.set(key, nowSeconds);
  return false;
}

function buildDataCheckString(payload: Omit<TelegramPayload, "hash">) {
  const entries = Object.entries(payload).filter(
    ([, value]) => value !== undefined && value !== null && value !== ""
  );
  return entries
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

function verifyTelegram(payload: TelegramPayload, botToken: string): boolean {
  const { hash, ...rest } = payload;
  const dataCheckString = buildDataCheckString(rest);
  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const signature = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  const receivedHash = Buffer.from(hash, "hex");
  const expectedHash = Buffer.from(signature, "hex");
  if (receivedHash.length !== expectedHash.length) return false;
  return crypto.timingSafeEqual(receivedHash, expectedHash);
}

function parsePayloadFromSearchParams(url: URL): TelegramPayload | null {
  const params = url.searchParams;
  const id = params.get("id");
  const hash = params.get("hash");
  const auth_date = params.get("auth_date");
  if (!id || !hash || !auth_date) return null;
  return {
    id,
    hash,
    auth_date,
    first_name: params.get("first_name") ?? undefined,
    last_name: params.get("last_name") ?? undefined,
    username: params.get("username") ?? undefined,
    photo_url: params.get("photo_url") ?? undefined,
  };
}

function ensureEnv(): { env?: AuthEnv; error?: NextResponse } {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const jwtSecret = process.env.AUTH_JWT_SECRET;

  if (!botToken || !supabaseUrl || !supabaseServiceKey || !jwtSecret) {
    return {
      error: NextResponse.json(
        {
          error: "AuthNotConfigured",
          message:
            "Отсутствует TELEGRAM_BOT_TOKEN, AUTH_JWT_SECRET или Supabase env (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)",
        },
        { status: 500 }
      ),
    };
  }

  return { env: { botToken, supabaseUrl, supabaseServiceKey, jwtSecret } };
}

async function upsertTelegramUser(
  supabase: SupabaseClient,
  payload: TelegramPayload,
  name: string
) {
  const telegramId = String(payload.id);
  const upsertPayload = {
    telegram_id: telegramId,
    telegram_handle: payload.username ?? null,
    name,
    avatar_url: payload.photo_url ?? null,
  };

  const { data, error } = await supabase
    .from("users")
    .upsert(upsertPayload, { onConflict: "telegram_id" })
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[auth/telegram] Supabase error on upsert user:", error);
    return { error };
  }

  return { data };
}

async function verifyUserExists(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[auth/telegram] Supabase error on verify user:", error);
    return { error };
  }

  if (!data) {
    console.error("[auth/telegram] User not created or returned after upsert.", { userId });
    return { data: null };
  }

  return { data };
}

async function handleTelegramAuth(payload: TelegramPayload | null) {
  const envResult = ensureEnv();
  if (envResult.error) return envResult.error;
  const env = envResult.env!;

  if (!payload || !payload.hash || !payload.id || !payload.auth_date) {
    return NextResponse.json(
      { error: "BadRequest", message: "Некорректные данные Telegram" },
      { status: 400 }
    );
  }

  const isValid = verifyTelegram(payload, env.botToken);
  if (!isValid) {
    return NextResponse.json(
      { error: "Forbidden", message: "Не удалось проверить подпись Telegram" },
      { status: 403 }
    );
  }

  const authDateSeconds = Number(payload.auth_date);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(authDateSeconds)) {
    return NextResponse.json(
      { error: "BadRequest", message: "Некорректное значение auth_date" },
      { status: 400 }
    );
  }
  if (authDateSeconds < nowSeconds - MAX_PAYLOAD_AGE_SECONDS) {
    return NextResponse.json(
      { error: "AuthExpired", message: "Слишком старый ответ Telegram. Обновите страницу и повторите вход." },
      { status: 403 }
    );
  }
  if (authDateSeconds > nowSeconds + ALLOWED_FUTURE_SKEW_SECONDS) {
    return NextResponse.json(
      { error: "BadRequest", message: "Некорректное время ответа Telegram" },
      { status: 400 }
    );
  }
  if (isReplay(payload)) {
    return NextResponse.json(
      { error: "AuthReplay", message: "Повторный ответ Telegram отклонён. Обновите страницу и попробуйте снова." },
      { status: 403 }
    );
  }

  const name =
    `${payload.first_name ?? ""} ${payload.last_name ?? ""}`.trim() ||
    payload.username ||
    "Пользователь";

  const supabase = createClient(env.supabaseUrl, env.supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: upserted, error: upsertError } = await upsertTelegramUser(
      supabase,
      payload,
      name
    );
    if (upsertError || !upserted) {
      return NextResponse.json(
        {
          error: "db_error",
          message: "Failed to upsert user in database.",
          detail: upsertError?.message ?? null,
        },
        { status: 503 }
      );
    }

    const { data: verified, error: verifyError } = await verifyUserExists(supabase, upserted.id);
    if (verifyError) {
      return NextResponse.json(
        {
          error: "db_error",
          message: "Failed to verify user in database.",
          detail: verifyError?.message ?? null,
        },
        { status: 503 }
      );
    }
    if (!verified) {
      return NextResponse.json(
        {
          error: "user_not_created",
          message: "Failed to create or load user after Telegram login.",
        },
        { status: 500 }
      );
    }

    const token = createAuthToken(verified.id);
    const user = {
      id: verified.id,
      name: verified.name,
      telegramHandle: verified.telegram_handle,
      avatarUrl: verified.avatar_url ?? null,
    };

    const response = NextResponse.json({ ok: true, user });
    setAuthCookie(response, token);
    
    // Revalidate all pages to update currentUser
    revalidatePath('/', 'layout');
    
    return response;
  } catch (err) {
    console.error("[auth/telegram] Unexpected error during Supabase operations", err);
    return NextResponse.json(
      {
        error: "db_error",
        message: "Unexpected database error during Telegram login.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TelegramPayload;
    return await handleTelegramAuth(body);
  } catch (err) {
    console.error("Telegram auth error", err);
    return NextResponse.json(
      { error: "InternalError", message: "Ошибка авторизации" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const payload = parsePayloadFromSearchParams(url);
    return await handleTelegramAuth(payload);
  } catch (err) {
    console.error("Telegram auth error", err);
    return NextResponse.json(
      { error: "InternalError", message: "Ошибка авторизации" },
      { status: 500 }
    );
  }
}
