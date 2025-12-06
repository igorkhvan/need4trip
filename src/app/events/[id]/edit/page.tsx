import { notFound } from "next/navigation";

import { EditEventForm } from "@/components/events/edit-event-form";
import { getCurrentUserSafe } from "@/lib/auth/currentUser";
import { getEventWithParticipantsVisibility } from "@/lib/services/events";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const { id } = await params;
  const currentUser = await getCurrentUserSafe();
  let eventWithParticipants: Awaited<ReturnType<typeof getEventWithParticipantsVisibility>>;
  try {
    eventWithParticipants = await getEventWithParticipantsVisibility(id, {
      currentUser,
      enforceVisibility: true,
    });
  } catch {
    return notFound();
  }
  const { event, participants } = eventWithParticipants;
  if (!event) return notFound();
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
