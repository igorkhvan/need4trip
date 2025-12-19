/**
 * Create Club Page
 * 
 * Страница создания нового клуба (protected)
 */

import { CreateClubPageContent } from "@/components/clubs/create-club-page-content";
import { getCurrentUser } from "@/lib/auth/currentUser";

export const dynamic = "force-dynamic";

export default async function CreateClubPage() {
  const currentUser = await getCurrentUser();

  return <CreateClubPageContent isAuthenticated={!!currentUser} />;
}
