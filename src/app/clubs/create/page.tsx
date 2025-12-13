/**
 * Create Club Page
 * 
 * Страница создания нового клуба (protected)
 */

import { ProtectedPage } from "@/components/auth/protected-page";
import { CreateClubPageContent } from "@/components/clubs/create-club-page-content";
import { getCurrentUser } from "@/lib/auth/currentUser";

export const dynamic = "force-dynamic";

export default async function CreateClubPage() {
  const currentUser = await getCurrentUser();

  return (
    <ProtectedPage
      isAuthenticated={!!currentUser}
      reason="REQUIRED"
      title="Создание клуба"
      description="Для создания клуба необходимо войти через Telegram."
    >
      <CreateClubPageContent />
    </ProtectedPage>
  );
}
