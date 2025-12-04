import { cookies } from "next/headers";
import crypto from "crypto";

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

function base64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function signJwt(payload: Record<string, unknown>, secret: string) {
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

function verifyJwt(token: string, secret: string): Record<string, unknown> | null {
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
  let payload: Record<string, unknown>;
  try {
    const payloadStr = Buffer.from(
      encodedPayload.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString();
    payload = JSON.parse(payloadStr) as Record<string, unknown>;
  } catch {
    return null;
  }
  const exp = payload.exp as number | undefined;
  if (exp && Date.now() / 1000 > exp) return null;
  return payload;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) return null;
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  const payload = verifyJwt(token, secret);
  if (!payload?.userId) return null;
  const user = await getUserById(String(payload.userId));
  if (!user) {
    try {
      if (typeof cookieStore.delete === "function") {
        cookieStore.delete("auth_token");
      } else if (typeof cookieStore.set === "function") {
        cookieStore.set("auth_token", "", { path: "/", maxAge: 0 });
      }
    } catch (err) {
      console.warn("Failed to clear auth cookie after missing user", err);
    }
    return null;
  }
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

export function createAuthToken(input: {
  userId: string;
  telegramId: number | string;
  username?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  telegramHandle?: string | null;
}) {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) throw new Error("AUTH_JWT_SECRET is not configured");
  const payload = {
    userId: input.userId,
    telegramId: input.telegramId,
    username: input.username,
    name: input.name,
    avatarUrl: input.avatarUrl,
    telegramHandle: input.telegramHandle,
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
  };
  return signJwt(payload, secret);
}
