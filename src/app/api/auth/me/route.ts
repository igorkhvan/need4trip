import { NextResponse } from "next/server";

import { clearAuthCookie } from "@/lib/auth/cookies";
import { getCurrentUser } from "@/lib/auth/currentUser";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    // Return null user instead of error for unauthenticated state
    // This prevents 401 errors in browser console
    return NextResponse.json({ user: null }, { status: 200 });
  }
  return NextResponse.json({ user });
}
