import Link from "next/link";
import { notFound } from "next/navigation";

import { Users, Calendar as CalendarIcon, MapPin, Car, PencilLine } from "lucide-react";

export const dynamic = "force-dynamic";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ParticipantModal } from "@/components/events/participant-modal";
import { ParticipantActions } from "@/components/events/participant-actions";
import { getEventWithParticipantsVisibility } from "@/lib/services/events";
import { getCurrentUserSafe } from "@/lib/auth/currentUser";
import { getGuestSessionId } from "@/lib/auth/guestSession";
import { getUserById } from "@/lib/db/userRepo";
import { getCategoryLabel, getCategoryBadgeVariant } from "@/lib/utils/eventCategories";
import { formatDateTime } from "@/lib/utils/dates";
import { formatCustomFieldValue, formatParticipantRole } from "@/lib/utils/customFields";

export default async function EventDetails({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const { id } = await params;
  const currentUser = await getCurrentUserSafe();
  const guestSessionId = currentUser ? null : await getGuestSessionId();
  
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
  const isFull =
    event.maxParticipants !== null &&
    event.maxParticipants !== undefined &&
    participants.length >= event.maxParticipants;
  
  // Check if user or guest is registered
  const isRegistered = currentUser
    ? participants.some((p) => p.userId === currentUser.id)
    : guestSessionId
      ? participants.some((p) => p.guestSessionId === guestSessionId)
      : false;
  const sortedCustomFields = [...(event.customFieldsSchema || [])].sort(
    (a, b) => a.order - b.order
  );

  const categoryLabel = event.category ? getCategoryLabel(event.category) : null;
  const categoryBadgeVariant = event.category ? getCategoryBadgeVariant(event.category) : "solid-gray";
  const formattedDateTime = formatDateTime(event.dateTime);
  const participantsCountLabel = `${participants.length} / ${event.maxParticipants ?? "∞"} участников`;
  const vehicleTypeLabelMap: Record<string, string> = {
    any: "Любой",
    sedan: "Легковой",
    crossover: "Кроссовер",
    suv: "Внедорожник",
  };
  const vehicleTypeLabel = vehicleTypeLabelMap[event.vehicleTypeRequirement] ?? "Любой";

  // Find current participant (authenticated or guest)
  const currentParticipant = currentUser
    ? participants.find((p) => p.userId === currentUser.id)
    : guestSessionId
      ? participants.find((p) => p.guestSessionId === guestSessionId)
      : undefined;
  const ownerUser =
    event.createdByUserId ? await getUserById(event.createdByUserId) : null;
  const fillPercent =
    event.maxParticipants && event.maxParticipants > 0
      ? Math.min(100, Math.round((participants.length / event.maxParticipants) * 100))
      : null;

  return (
    <>
      {/* Back button */}
      <Button variant="ghost" asChild className="mb-6">
        <Link href="/events">← Назад к событиям</Link>
      </Button>

      {/* Header Section */}
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          {/* Title */}
          <h1 className="mb-4 text-[32px] font-bold leading-[1.2] text-[#1F2937] md:text-[36px]">
            {event.title}
          </h1>

          {/* Badges */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {categoryLabel && event.category ? (
              <Badge variant={categoryBadgeVariant} size="md">
                {categoryLabel}
              </Badge>
            ) : null}
            {event.isClubEvent && <Badge variant="club" size="md">Клубное событие</Badge>}
            <Badge variant={event.isPaid ? "paid" : "free"} size="md">
              {event.isPaid ? "Платное" : "Бесплатное"}
            </Badge>
            {isRegistered && (
              <Badge variant="success" size="md">
                ✓ Вы зарегистрированы
              </Badge>
            )}
            {isFull && !isRegistered && (
              <Badge variant="warning" size="md">
                Лимит достигнут
              </Badge>
            )}
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 gap-4 text-[15px] text-[#6B7280] md:grid-cols-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 flex-shrink-0" />
              <span>{formattedDateTime}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 flex-shrink-0" />
              <span>{event.locationText}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 flex-shrink-0" />
              <span>{participantsCountLabel}</span>
            </div>
            {event.city && (
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 flex-shrink-0" />
                <span>{event.city.name}{event.city.region && `, ${event.city.region}`}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row md:flex-col md:w-auto">
          {!isRegistered && !isFull && (
            <ParticipantModal
              mode="create"
              eventId={event.id}
              customFieldsSchema={event.customFieldsSchema}
              event={event}
              triggerLabel="Присоединиться"
            />
          )}
          {isOwner && (
            <Button variant="secondary" asChild className="w-full sm:w-auto">
              <Link href={`/events/${event.id}/edit`}>
                <PencilLine className="mr-2 h-4 w-4" />
                Редактировать
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {fillPercent !== null && (
        <div className="mb-8">
          <ProgressBar value={fillPercent} label="Заполнено мест" />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          {/* Left Column - Description, Rules, Participants */}
          <div className="space-y-6">
            {/* Description Card */}
            <Card>
              <CardHeader>
                <CardTitle>Описание</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-[15px] leading-[1.6] text-[#374151]">
                  {event.description}
                </p>
              </CardContent>
            </Card>

            {/* Rules Card */}
            {event.rules && event.rules.trim().length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Правила участия</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line text-[15px] leading-[1.6] text-[#374151]">
                    {event.rules}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Participants Card */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Участники ({participants.length})
                </CardTitle>
                <CardDescription>
                  {participantsCountLabel}
                </CardDescription>
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
                          {(isOwner || currentUser || guestSessionId) && (
                            <TableHead className="w-24 text-right text-[13px] font-semibold uppercase text-[#6B7280]">
                              Действия
                            </TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {participants.map((participant, index) => (
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
                            <TableCell className="font-medium text-[#111827]">
                              <span className="text-[15px]">{participant.displayName}</span>
                            </TableCell>

                            {/* Роль */}
                            <TableCell className="text-[15px] text-[#6B7280]">
                              {formatParticipantRole(participant.role)}
                            </TableCell>

                            {/* Дополнительные поля (все в одной колонке) */}
                            {sortedCustomFields.length > 0 && (
                              <TableCell className="text-[13px]">
                                <div className="space-y-1.5">
                                  {sortedCustomFields.map((field) => {
                                    const value = formatCustomFieldValue(
                                      participant.customFieldValues?.[field.id],
                                      field.type
                                    );
                                    
                                    if (!value || value === "—") return null;
                                    
                                    return (
                                      <div key={field.id}>
                                        <span className="text-[#6B7280]">{field.label}:</span>{" "}
                                        <span className="text-[#111827]">{value}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </TableCell>
                            )}

                            {/* Действия */}
                            {(isOwner || currentUser || guestSessionId) && (
                              <TableCell className="text-right">
                                <ParticipantActions
                                  eventId={event.id}
                                  participantId={participant.id}
                                  canEdit={
                                    Boolean(isOwner) ||
                                    Boolean(currentUser && participant.userId === currentUser.id) ||
                                    Boolean(guestSessionId && participant.guestSessionId === guestSessionId)
                                  }
                                  canRemove={
                                    Boolean(isOwner) ||
                                    Boolean(currentUser && participant.userId === currentUser.id) ||
                                    Boolean(guestSessionId && participant.guestSessionId === guestSessionId)
                                  }
                                  isOwner={Boolean(isOwner)}
                                  authMissing={false}
                                  customFieldsSchema={event.customFieldsSchema}
                                  event={event}
                                  participantData={{
                                    displayName: participant.displayName,
                                    role: participant.role,
                                    customFieldValues: participant.customFieldValues,
                                  }}
                                />
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-[#E5E7EB] bg-white px-4 py-12 text-center">
                    <p className="text-[15px] text-[#6B7280]">
                      Пока никто не зарегистрировался. Будьте первым!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Price Card */}
            {event.isPaid && (
              <Card>
                <CardHeader>
                  <CardTitle>Стоимость участия</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-[32px] font-bold leading-none text-[#1F2937]">
                    {event.price ?? 0} {event.currency?.symbol ?? event.currencyCode ?? ""}
                  </p>
                  <p className="text-[13px] text-[#6B7280]">за экипаж</p>
                </CardContent>
              </Card>
            )}

            {/* Vehicle Requirements Card */}
            <Card>
              <CardHeader>
                <CardTitle>Требования к авто</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <p className="text-[13px] font-medium text-[#6B7280]">Тип автомобиля</p>
                  <p className="text-[15px] font-semibold text-[#1F2937]">
                    {vehicleTypeLabel}
                  </p>
                </div>
                {event.allowedBrands.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[13px] font-medium text-[#6B7280]">Рекомендуемые марки</p>
                    <div className="flex flex-wrap gap-2">
                      {event.allowedBrands.map((brand) => (
                        <Badge 
                          key={brand.id}
                          variant="secondary" 
                          size="md"
                          className="rounded-full"
                        >
                          {brand.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Organizer Card */}
            {ownerUser && (
              <Card>
                <CardHeader>
                  <CardTitle>Организатор</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-[15px] font-semibold text-[#1F2937]">
                    {ownerUser.name || ownerUser.telegramHandle || "Организатор"}
                  </p>
                  {ownerUser.telegramHandle && (
                    <p className="text-[13px] text-[#6B7280]">@{ownerUser.telegramHandle}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
    </>
  );
}
