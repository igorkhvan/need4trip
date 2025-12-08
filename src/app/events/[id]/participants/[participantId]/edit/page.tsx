import { redirect } from "next/navigation";

export default async function EditParticipantPage({
  params,
}: {
  params: Promise<{ id: string; participantId: string }> | { id: string; participantId: string };
}) {
  const { id } = await params;
  // Редактирование теперь происходит через модальное окно на странице события
  redirect(`/events/${id}`);
}
