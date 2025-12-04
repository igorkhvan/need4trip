import { NextResponse } from "next/server";

import { clearAuthCookie } from "@/lib/auth/cookies";
import { getCurrentUser } from "@/lib/auth/currentUser";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    const res = NextResponse.json({ error: "unauthorized" }, { status: 401 });
    clearAuthCookie(res);
    return res;
  }
  return NextResponse.json({ user });
}
