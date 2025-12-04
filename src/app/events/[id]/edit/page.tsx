import { notFound } from "next/navigation";

import { EditEventForm } from "@/components/events/edit-event-form";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getEventWithParticipants } from "@/lib/services/events";
import { formatEventDateTime } from "@/lib/utils";

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
  const formattedDateTime = formatEventDateTime(event.dateTime);

  return (
    <EditEventForm
      event={event}
      hasParticipants={hasParticipants}
      isOwner={isOwner}
      authMissing={!currentUser}
      formattedDateTime={formattedDateTime}
    />
  );
}
