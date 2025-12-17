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
import { ParticipantModal } from "@/components/events/participant-modal";
import type { Event } from "@/lib/types/event";

interface EventParticipantsAsyncProps {
  eventId: string;
  event: Event;
  isOwner: boolean;
  currentUserId?: string | null;
  guestSessionId?: string | null;
  isPastEvent?: boolean;
}

export async function EventParticipantsAsync({
  eventId,
  event,
  isOwner,
  currentUserId,
  guestSessionId,
  isPastEvent = false,
}: EventParticipantsAsyncProps) {
  // Загружаем участников
  const dbParticipants = await listParticipants(eventId);
  const participants = dbParticipants.map(mapDbParticipantToDomain);

  const participantsCountLabel = `${participants.length} / ${event.maxParticipants ?? "∞"} участников`;

  // Проверяем, зарегистрирован ли текущий пользователь
  const isUserRegistered = participants.some(
    (p) => 
      (currentUserId && p.userId === currentUserId) ||
      (guestSessionId && p.guestSessionId === guestSessionId)
  );

  // Проверяем, заполнено ли событие
  const isFull =
    event.maxParticipants !== null &&
    event.maxParticipants !== undefined &&
    participants.length >= event.maxParticipants;

  // Показываем кнопку "Присоединиться" только если:
  // 1. Пользователь не зарегистрирован
  // 2. Событие не заполнено
  // 3. Событие не прошло
  const showJoinButton = !isUserRegistered && !isFull && !isPastEvent;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Участники ({participants.length})</CardTitle>
        <CardDescription>{participantsCountLabel}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ParticipantsTableClient
          initialParticipants={participants}
          event={event}
          isOwner={isOwner}
          currentUserId={currentUserId}
          guestSessionId={guestSessionId}
        />
        
        {/* Кнопка "Присоединиться" внизу справа */}
        {showJoinButton && (
          <div className="flex justify-end pt-2">
            <ParticipantModal
              mode="create"
              eventId={event.id}
              customFieldsSchema={event.customFieldsSchema}
              event={event}
              triggerLabel="Присоединиться"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
