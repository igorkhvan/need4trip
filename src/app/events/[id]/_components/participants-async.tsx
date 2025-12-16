/**
 * EventParticipantsAsync Component
 * 
 * Async компонент для загрузки списка участников события.
 * Используется внутри Suspense boundary для параллельной загрузки.
 * Передает данные в client компонент для optimistic UI.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listParticipants } from "@/lib/db/participantRepo";
import { mapDbParticipantToDomain } from "@/lib/mappers";
import { ParticipantsTableClient } from "./participants-table-client";
import type { Event } from "@/lib/types/event";

interface EventParticipantsAsyncProps {
  eventId: string;
  event: Event;
  isOwner: boolean;
  currentUserId?: string | null;
  guestSessionId?: string | null;
}

export async function EventParticipantsAsync({
  eventId,
  event,
  isOwner,
  currentUserId,
  guestSessionId,
}: EventParticipantsAsyncProps) {
  // Загружаем участников
  const dbParticipants = await listParticipants(eventId);
  const participants = dbParticipants.map(mapDbParticipantToDomain);

  const participantsCountLabel = `${participants.length} / ${event.maxParticipants ?? "∞"} участников`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Участники ({participants.length})</CardTitle>
        <CardDescription>{participantsCountLabel}</CardDescription>
      </CardHeader>
      <CardContent>
        <ParticipantsTableClient
          initialParticipants={participants}
          event={event}
          isOwner={isOwner}
          currentUserId={currentUserId}
          guestSessionId={guestSessionId}
        />
      </CardContent>
    </Card>
  );
}
