import { notFound } from "next/navigation";

import { EditEventForm } from "@/components/events/edit-event-form";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getEventWithParticipants } from "@/lib/services/events";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const { id } = await params;
  const { event, participants } = await getEventWithParticipants(id);
  if (!event) return notFound();
  const currentUser = await getCurrentUser();
  const isOwner = currentUser?.id === event.createdByUserId;
  const hasParticipants = participants.length > 0;

  return (
    <EditEventForm
      event={event}
      hasParticipants={hasParticipants}
      isOwner={isOwner}
      authMissing={!currentUser}
      formattedDateTime={new Date(event.dateTime).toLocaleString("ru-RU")}
    />
  );
}
