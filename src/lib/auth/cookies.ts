import { NextResponse } from "next/server";

const isProd = process.env.NODE_ENV === "production";

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set("auth_token", "", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
