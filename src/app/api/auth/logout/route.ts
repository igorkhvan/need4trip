import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { clearAuthCookie } from "@/lib/auth/cookies";

function handleLogout() {
  const res = NextResponse.json({ ok: true });
  clearAuthCookie(res);
  
  // Revalidate all pages to clear currentUser
  revalidatePath('/', 'layout');
  
  return res;
}

export async function POST() {
  return handleLogout();
}

export async function GET() {
  return handleLogout();
}
