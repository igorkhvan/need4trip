import { notFound } from "next/navigation";

import { EditParticipationForm } from "@/components/events/edit-participation-form";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getEventWithParticipantsVisibility } from "@/lib/services/events";

export default async function EditParticipantPage({
  params,
}: {
  params: Promise<{ id: string; participantId: string }> | { id: string; participantId: string };
}) {
  const { id, participantId } = await params;
  const currentUser = await getCurrentUser();
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
  const participant = participants.find((p) => p.id === participantId);
  if (!participant) return notFound();
  const isSelf = currentUser && participant.userId === currentUser.id;

  return (
    <EditParticipationForm
      eventId={event.id}
      participantId={participant.id}
      customFields={event.customFieldsSchema}
      initialValues={participant.customFieldValues}
      displayName={participant.displayName}
      isSelf={Boolean(isSelf)}
      authMissing={!currentUser}
    />
  );
}
