import { CreateEventPageContent } from "@/components/events/create-event-page-content";
import { getCurrentUser } from "@/lib/auth/currentUser";

export const dynamic = "force-dynamic";

export default async function CreateEventPage() {
  const currentUser = await getCurrentUser();

  return <CreateEventPageContent isAuthenticated={!!currentUser} />;
}
