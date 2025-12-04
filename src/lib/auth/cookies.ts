import { NextResponse } from "next/server";

export const AUTH_COOKIE_NAME = "auth_token";
export const AUTH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

const isProd = process.env.NODE_ENV === "production";

const baseCookieConfig = {
  httpOnly: true as const,
  secure: isProd,
  sameSite: "lax" as const,
  path: "/",
};

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    ...baseCookieConfig,
    maxAge: AUTH_COOKIE_MAX_AGE,
  });
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    ...baseCookieConfig,
    maxAge: 0,
  });
}
