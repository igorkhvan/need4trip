/**
 * User Profile Page - Server Component Wrapper
 * 
 * Responsibilities:
 * - Server-side authentication check
 * - Redirect unauthenticated users to home with login prompt
 * - Render ProfilePageClient for authenticated users
 * 
 * Architecture:
 * - Server Component (secure, no client state)
 * - Follows same pattern as events/create/page.tsx
 * - Auth check happens BEFORE render (no skeleton flash)
 */

import { getCurrentUser } from "@/lib/auth/currentUser";
import { redirect } from "next/navigation";
import { ProfilePageClient } from "@/components/profile/profile-page-client";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  // Server-side auth check
  const currentUser = await getCurrentUser();
  
  // Redirect unauthenticated users to home
  // They will see login modal via AuthModalHost or can click login button
  if (!currentUser) {
    redirect("/?auth=required");
  }
  
  // Auth guaranteed - render client component
  return <ProfilePageClient />;
}
