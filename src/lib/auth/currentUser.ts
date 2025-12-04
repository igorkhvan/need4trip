import { cookies } from "next/headers";
import crypto from "crypto";

import { AUTH_COOKIE_MAX_AGE, AUTH_COOKIE_NAME } from "@/lib/auth/cookies";
import { getUserById } from "@/lib/db/userRepo";
import { ExperienceLevel } from "@/lib/types/user";

export interface CurrentUser {
  id: string;
  name?: string | null;
  telegramHandle?: string | null;
  telegramId?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  carModel?: string | null;
  experienceLevel?: ExperienceLevel | null;
  createdAt?: string;
  updatedAt?: string;
}

type AuthPayload = {
  userId: string;
  exp: number;
};

const TOKEN_TTL_SECONDS = AUTH_COOKIE_MAX_AGE;

function base64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function signJwt(payload: AuthPayload, secret: string) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac("sha256", secret).update(data).digest("base64");
  const encodedSignature = signature
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${data}.${encodedSignature}`;
}

function verifyJwt(token: string, secret: string): AuthPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  if (expected !== encodedSignature) return null;
  let payload: AuthPayload;
  try {
    const payloadStr = Buffer.from(
      encodedPayload.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString();
    payload = JSON.parse(payloadStr) as AuthPayload;
  } catch {
    return null;
  }
  if (!payload.userId) return null;
  if (payload.exp && Date.now() / 1000 > payload.exp) return null;
  return payload;
}

export function decodeAuthToken(token: string): AuthPayload | null {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) return null;
  return verifyJwt(token, secret);
}

export function createAuthToken(userId: string) {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) throw new Error("AUTH_JWT_SECRET is not configured");
  const payload: AuthPayload = {
    userId,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  return signJwt(payload, secret);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) return null;
  const cookieStore = cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyJwt(token, secret);
  if (!payload?.userId) return null;

  let user: Awaited<ReturnType<typeof getUserById>> = null;
  try {
    user = await getUserById(String(payload.userId));
  } catch (err) {
    console.error("[getCurrentUser] Failed to load user from DB", err);
    return null;
  }

  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    telegramHandle: user.telegramHandle,
    telegramId: user.telegramId ?? null,
    avatarUrl: user.avatarUrl,
    phone: user.phone ?? null,
    email: user.email ?? null,
    carModel: user.carModel ?? null,
    experienceLevel: user.experienceLevel ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
