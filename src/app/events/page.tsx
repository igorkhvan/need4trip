import { EventsGrid } from "@/components/events/events-grid";
import { listVisibleEventsForUser } from "@/lib/services/events";
import { getCurrentUserSafe } from "@/lib/auth/currentUser";

export default async function EventsPage() {
  const currentUser = await getCurrentUserSafe();
  const events = await listVisibleEventsForUser(currentUser?.id ?? null);

  return (
    <div className="page-container py-12">
      <EventsGrid events={events} currentUserId={currentUser?.id ?? null} />
    </div>
  );
}
