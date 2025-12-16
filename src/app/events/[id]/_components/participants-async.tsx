/**
 * EventParticipantsAsync Component
 * 
 * Async компонент для загрузки списка участников события.
 * Используется внутри Suspense boundary для параллельной загрузки.
 */

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ParticipantActions } from "@/components/events/participant-actions";
import { listParticipants } from "@/lib/db/participantRepo";
import { mapDbParticipantToDomain } from "@/lib/mappers";
import { formatCustomFieldValue, formatParticipantRole } from "@/lib/utils/customFields";
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

  const sortedCustomFields = [...(event.customFieldsSchema || [])].sort(
    (a, b) => a.order - b.order
  );

  const participantsCountLabel = `${participants.length} / ${event.maxParticipants ?? "∞"} участников`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Участники ({participants.length})</CardTitle>
        <CardDescription>{participantsCountLabel}</CardDescription>
      </CardHeader>
      <CardContent>
        {participants.length ? (
          <div className="overflow-hidden rounded-xl border border-[#E5E7EB]">
            <Table>
              <TableHeader className="bg-[#F9FAFB]">
                <TableRow className="border-b border-[#E5E7EB]">
                  <TableHead className="w-16 text-center text-[13px] font-semibold uppercase text-[#6B7280]">
                    №
                  </TableHead>
                  <TableHead className="text-[13px] font-semibold uppercase text-[#6B7280]">
                    Экипаж
                  </TableHead>
                  <TableHead className="text-[13px] font-semibold uppercase text-[#6B7280]">
                    Роль
                  </TableHead>
                  {sortedCustomFields.length > 0 && (
                    <TableHead className="text-[13px] font-semibold uppercase text-[#6B7280]">
                      Доп. поля
                    </TableHead>
                  )}
                  {(isOwner || currentUserId || guestSessionId) && (
                    <TableHead className="w-24 text-right text-[13px] font-semibold uppercase text-[#6B7280]">
                      Действия
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.map((participant, index) => {
                  const canEdit =
                    isOwner ||
                    participant.userId === currentUserId ||
                    participant.guestSessionId === guestSessionId;

                  return (
                    <TableRow
                      key={participant.id}
                      className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB]/50 transition-colors"
                    >
                      {/* Номер */}
                      <TableCell className="text-center">
                        <div className="flex h-8 w-8 mx-auto items-center justify-center rounded-full bg-[#FF6F2C]/10 text-[#FF6F2C] text-sm font-semibold">
                          {index + 1}
                        </div>
                      </TableCell>

                      {/* Экипаж */}
                      <TableCell>
                        <div className="space-y-1">
                          {participant.userId ? (
                            <Link
                              href={`/profile/${participant.userId}`}
                              className="font-medium text-[#111827] hover:text-[var(--color-primary)] hover:underline"
                            >
                              {participant.driverName}
                            </Link>
                          ) : (
                            <span className="font-medium text-[#111827]">
                              {participant.driverName}
                            </span>
                          )}
                          {participant.crewSize &&
                            participant.crewSize > 1 && (
                              <div className="text-[13px] text-[#6B7280]">
                                +{participant.crewSize - 1} пассажир
                                {participant.crewSize === 2 ||
                                participant.crewSize === 3 ||
                                participant.crewSize === 4
                                  ? "а"
                                  : "ов"}
                              </div>
                            )}
                        </div>
                      </TableCell>

                      {/* Роль */}
                      <TableCell>
                        <div className="text-[14px] text-[#374151]">
                          {formatParticipantRole(participant.role)}
                        </div>
                      </TableCell>

                      {/* Доп. поля */}
                      {sortedCustomFields.length > 0 && (
                        <TableCell>
                          <div className="space-y-1 text-[14px] text-[#374151]">
                            {sortedCustomFields.map((field) => {
                              const value =
                                participant.customFieldValues?.[
                                  field.name
                                ];
                              if (!value) return null;
                              return (
                                <div key={field.name}>
                                  <span className="text-[#6B7280]">
                                    {field.label}:{" "}
                                  </span>
                                  <span className="font-medium">
                                    {formatCustomFieldValue(field, value)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </TableCell>
                      )}

                      {/* Действия */}
                      {(isOwner || currentUserId || guestSessionId) && (
                        <TableCell className="text-right">
                          {canEdit && (
                            <ParticipantActions
                              eventId={eventId}
                              participant={participant}
                              isOwner={isOwner}
                              event={event}
                            />
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-12 text-center">
            <p className="text-[15px] text-[#6B7280]">
              Пока нет зарегистрированных участников
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
