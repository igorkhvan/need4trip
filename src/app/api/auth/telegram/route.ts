import crypto from "crypto";
import { NextResponse } from "next/server";

import { createAuthToken } from "@/lib/auth/currentUser";
import { findUserByTelegramId, upsertTelegramUser } from "@/lib/db/userRepo";

type TelegramPayload = {
  id: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number | string;
  hash: string;
};

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

async function handleTelegramAuth(payload: TelegramPayload) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const jwtSecret = process.env.AUTH_JWT_SECRET;
  if (!botToken || !jwtSecret) {
    return NextResponse.json(
      { error: "AuthNotConfigured", message: "Отсутствует TELEGRAM_BOT_TOKEN или AUTH_JWT_SECRET" },
      { status: 500 }
    );
  }

  if (!payload || !payload.hash || !payload.id) {
    return NextResponse.json(
      { error: "BadRequest", message: "Некорректные данные Telegram" },
      { status: 400 }
    );
  }

  const isValid = verifyTelegram(payload, botToken);
  if (!isValid) {
    return NextResponse.json(
      { error: "Forbidden", message: "Не удалось проверить подпись Telegram" },
      { status: 403 }
    );
  }

  const name =
    `${payload.first_name ?? ""} ${payload.last_name ?? ""}`.trim() ||
    payload.username ||
    "Пользователь";

  const existing = await findUserByTelegramId(String(payload.id));
  const user =
    existing ??
    (await upsertTelegramUser({
      telegramId: String(payload.id),
      name,
      telegramHandle: payload.username,
      avatarUrl: payload.photo_url,
    }));

  const token = createAuthToken({
    userId: user.id,
    telegramId: payload.id,
    username: payload.username,
    name: user.name,
    avatarUrl: user.avatarUrl,
    telegramHandle: user.telegramHandle,
  });

  const response = NextResponse.json({ ok: true, user });
  response.cookies.set("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  return response;
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
    if (!payload) {
      return NextResponse.json(
        { error: "BadRequest", message: "Некорректные данные Telegram" },
        { status: 400 }
      );
    }
    return await handleTelegramAuth(payload);
  } catch (err) {
    console.error("Telegram auth error", err);
    return NextResponse.json(
      { error: "InternalError", message: "Ошибка авторизации" },
      { status: 500 }
    );
  }
}
