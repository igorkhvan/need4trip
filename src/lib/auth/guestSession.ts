import { cookies } from "next/headers";
import { randomUUID } from "crypto";

const GUEST_SESSION_COOKIE_NAME = "guest_session_id";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

/**
 * Получает или создает guest session ID для незарегистрированных пользователей
 * Session ID хранится в cookie и используется для:
 * 1. Предотвращения повторной регистрации на одно событие
 * 2. Разрешения редактирования/удаления своей регистрации
 */
export async function getOrCreateGuestSessionId(): Promise<string> {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get(GUEST_SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    sessionId = randomUUID();
    cookieStore.set(GUEST_SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
  }

  return sessionId;
}

/**
 * Получает guest session ID если он существует (не создает новый)
 */
export async function getGuestSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(GUEST_SESSION_COOKIE_NAME)?.value ?? null;
}

/**
 * Клиентская версия - получает session ID из cookie
 */
export function getGuestSessionIdClient(): string | null {
  if (typeof document === "undefined") return null;
  
  const cookies = document.cookie.split("; ");
  const sessionCookie = cookies.find((c) => c.startsWith(`${GUEST_SESSION_COOKIE_NAME}=`));
  
  if (!sessionCookie) return null;
  
  return sessionCookie.split("=")[1] ?? null;
}

