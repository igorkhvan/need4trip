import { revalidatePath } from "next/cache";
import { clearAuthCookie } from "@/lib/auth/cookies";
import { respondSuccess } from "@/lib/api/response";

function handleLogout() {
  const res = respondSuccess({ ok: true });
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
