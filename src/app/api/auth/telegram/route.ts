import crypto from "crypto";
import { NextResponse } from "next/server";

import { createAuthToken } from "@/lib/auth/currentUser";
import { findUserByTelegramId, upsertTelegramUser } from "@/lib/db/userRepo";

type TelegramPayload = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

function verifyTelegram(payload: TelegramPayload, botToken: string): boolean {
  const { hash, ...rest } = payload;
  const dataCheckString = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${(rest as Record<string, unknown>)[key]}`)
    .join("\n");
  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const signature = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  return signature === hash;
}

export async function POST(request: Request) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const jwtSecret = process.env.AUTH_JWT_SECRET;
    if (!botToken || !jwtSecret) {
      return NextResponse.json(
        { error: "Auth is not configured", message: "Отсутствует TELEGRAM_BOT_TOKEN или AUTH_JWT_SECRET" },
        { status: 500 }
      );
    }
    const body = (await request.json()) as TelegramPayload;
    if (!body || !body.hash || !body.id) {
      return NextResponse.json({ error: "BadRequest", message: "Некорректные данные Telegram" }, { status: 400 });
    }
    const isValid = verifyTelegram(body, botToken);
    if (!isValid) {
      return NextResponse.json(
        { error: "Forbidden", message: "Не удалось проверить подпись Telegram" },
        { status: 403 }
      );
    }

    const name = `${body.first_name ?? ""} ${body.last_name ?? ""}`.trim() || body.username || "Пользователь";
    const existing = await findUserByTelegramId(String(body.id));
    const user =
      existing ??
      (await upsertTelegramUser({
        telegramId: String(body.id),
        name,
        telegramHandle: body.username,
        avatarUrl: body.photo_url,
      }));

    const token = createAuthToken({
      userId: user.id,
      telegramId: body.id,
      username: body.username,
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
  } catch (err) {
    console.error("Telegram auth error", err);
    return NextResponse.json(
      { error: "InternalError", message: "Ошибка авторизации" },
      { status: 500 }
    );
  }
}
