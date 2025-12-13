import { ProtectedPage } from "@/components/auth/protected-page";
import { CreateEventPageContent } from "@/components/events/create-event-page-content";
import { getCurrentUser } from "@/lib/auth/currentUser";

export const dynamic = "force-dynamic";

export default async function CreateEventPage() {
  const currentUser = await getCurrentUser();

  return (
    <ProtectedPage
      isAuthenticated={!!currentUser}
      reason="REQUIRED"
      title="Создание события"
      description="Для создания события необходимо войти через Telegram."
    >
      <CreateEventPageContent />
    </ProtectedPage>
  );
}
