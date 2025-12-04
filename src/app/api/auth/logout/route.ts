import { NextResponse } from "next/server";

import { clearAuthCookie } from "@/lib/auth/cookies";

function handleLogout() {
  const res = NextResponse.json({ ok: true });
  clearAuthCookie(res);
  return res;
}

export async function POST() {
  return handleLogout();
}

export async function GET() {
  return handleLogout();
}
