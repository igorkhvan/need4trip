import Link from "next/link";
import { notFound } from "next/navigation";

import { Users, Calendar as CalendarIcon, MapPin, Car, PencilLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RegisterParticipantModal } from "@/components/events/register-participant-modal";
import { ParticipantActions } from "@/components/events/participant-actions";
import { getEventWithParticipantsVisibility } from "@/lib/services/events";
import { EventCategory } from "@/lib/types/event";
import { getCurrentUserSafe } from "@/lib/auth/currentUser";
import { getUserById } from "@/lib/db/userRepo";

const CATEGORY_LABELS: Record<EventCategory, string> = {
  weekend_trip: "Выезд на выходные",
  technical_ride: "Техническая покатушка",
  meeting: "Встреча",
  training: "Тренировка",
  service_day: "Сервис-день",
  other: "Другое",
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function EventDetails({
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
  const isFull =
    event.maxParticipants !== null &&
    event.maxParticipants !== undefined &&
    participants.length >= event.maxParticipants;
  const isRegistered = currentUser
    ? participants.some((p) => p.userId === currentUser.id)
    : false;
  const sortedCustomFields = [...(event.customFieldsSchema || [])].sort(
    (a, b) => a.order - b.order
  );

  const categoryLabel = event.category ? CATEGORY_LABELS[event.category] : null;
  const formattedDateTime = formatDateTime(event.dateTime);
  const participantsCountLabel = `${participants.length} / ${event.maxParticipants ?? "∞"} участников`;
  const vehicleTypeLabelMap: Record<string, string> = {
    any: "Любой",
    sedan: "Легковой",
    crossover: "Кроссовер",
    suv: "Внедорожник",
  };
  const vehicleTypeLabel = vehicleTypeLabelMap[event.vehicleTypeRequirement] ?? "Любой";

  const currentParticipant = currentUser
    ? participants.find((p) => p.userId === currentUser.id)
    : undefined;
  const ownerUser =
    event.createdByUserId ? await getUserById(event.createdByUserId) : null;
  const fillPercent =
    event.maxParticipants && event.maxParticipants > 0
      ? Math.min(100, Math.round((participants.length / event.maxParticipants) * 100))
      : null;

  const formatCustomValue = (
    value: unknown,
    type: (typeof event.customFieldsSchema)[number]["type"]
  ) => {
    if (value === null || value === undefined || value === "") return "—";
    if (type === "boolean") return value ? "Да" : "Нет";
    return String(value);
  };

  return (
    <div className="section bg-white">
      <div className="section-inner space-y-8">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/events">← Назад к событиям</Link>
          </Button>
        </div>

        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {categoryLabel ? (
                <Badge variant="secondary" className="bg-[#FFF4EF] text-[#E86223]">
                  {categoryLabel}
                </Badge>
              ) : null}
              {event.isClubEvent && (
                <Badge variant="secondary" className="bg-[#F0FDF4] text-[#16A34A]">
                  Клубное событие
                </Badge>
              )}
              <Badge variant="outline" className="border-[#E5E7EB] text-[#374151]">
                {event.isPaid ? "Платное" : "Бесплатное"}
              </Badge>
              <Badge variant="outline" className="border-[#E5E7EB] text-[#374151]">
                {vehicleTypeLabel}
              </Badge>
            </div>
            <h1 className="text-5xl font-bold leading-tight text-[#111827]">{event.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-base text-[#6B7280]">
              <span className="inline-flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {formattedDateTime}
              </span>
              <span className="inline-flex items-center gap-2">
                <Users className="h-5 w-5" />
                {participantsCountLabel}
              </span>
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {event.locationText}
              </span>
              <span className="inline-flex items-center gap-2">
                <Car className="h-5 w-5" />
                {ownerUser?.telegramHandle ? `@${ownerUser.telegramHandle}` : ownerUser?.name ?? "Организатор"}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:gap-3">
            {isRegistered ? (
              <>
                <Badge variant="secondary" className="w-fit bg-[#F0FDF4] text-[#16A34A]">
                  Вы зарегистрированы
                </Badge>
                {currentParticipant && (
                  <Button variant="secondary" size="sm" asChild>
                    <Link href={`/events/${event.id}/participants/${currentParticipant.id}/edit`}>
                      Редактировать данные
                    </Link>
                  </Button>
                )}
              </>
            ) : isFull ? (
              <Badge variant="secondary" className="w-fit bg-[#FFF4EF] text-[#E86223]">
                Лимит участников достигнут
              </Badge>
            ) : (
              <RegisterParticipantModal
                eventId={event.id}
                customFieldsSchema={event.customFieldsSchema}
                event={event}
                triggerLabel="Присоединиться"
              />
            )}
            {isOwner && (
              <Button variant="secondary" asChild>
                <Link href={`/events/${event.id}/edit`} className="inline-flex items-center gap-2">
                  <PencilLine className="h-4 w-4" />
                  Редактировать
                </Link>
              </Button>
            )}
          </div>
        </div>

        {fillPercent !== null && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-[#6B7280]">
              <span>Заполнено мест</span>
              <span className="text-[#111827]">{fillPercent}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#F3F4F6]">
              <div
                className="h-full rounded-full bg-[#FF6F2C] transition-all duration-300"
                style={{ width: `${fillPercent}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-[28px] font-semibold text-foreground">Описание</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-base leading-relaxed text-foreground">{event.description}</p>
              </CardContent>
            </Card>

            {event.rules && event.rules.trim().length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-[28px] font-semibold text-foreground">Правила участия</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line text-base leading-relaxed text-foreground">
                    {event.rules}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-[28px] font-semibold text-foreground">
                    Участники ({participants.length})
                  </CardTitle>
                  <CardDescription>{participantsCountLabel}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {participants.length ? (
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Экипаж</TableHead>
                          <TableHead>Роль</TableHead>
                          <TableHead>Пользователь</TableHead>
                          {sortedCustomFields.map((field) => (
                            <TableHead key={field.id}>{field.label}</TableHead>
                          ))}
                          {(isOwner || currentUser) && (
                            <TableHead className="text-right">Действия</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {participants.map((participant) => (
                          <TableRow key={participant.id} className="hover:bg-muted/30">
                            <TableCell className="font-medium">
                              <div className="flex flex-col gap-1">
                                <span>{participant.displayName}</span>
                                <div className="flex flex-wrap gap-1">
                                  {participant.userId ? (
                                    <Badge className="bg-slate-100 text-slate-800" variant="outline">
                                      Пользователь
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-slate-100 text-slate-800" variant="outline">
                                      Гость
                                    </Badge>
                                  )}
                                  {participant.userId === event.createdByUserId && (
                                    <Badge variant="secondary">Владелец</Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {participant.role === "leader"
                                ? "Лидер"
                                : participant.role === "tail"
                                  ? "Замыкающий"
                                  : "Участник"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {participant.user?.telegramHandle ?? participant.userId ?? "Гость"}
                            </TableCell>
                            {sortedCustomFields.map((field) => (
                              <TableCell key={field.id} className="text-muted-foreground">
                                {formatCustomValue(
                                  participant.customFieldValues?.[field.id],
                                  field.type
                                )}
                              </TableCell>
                            ))}
                            {(isOwner || currentUser) && (
                              <TableCell className="text-right">
                                <div className="flex justify-end">
                                  <ParticipantActions
                                    eventId={event.id}
                                    participantId={participant.id}
                                    canEdit={Boolean(currentUser && participant.userId === currentUser.id)}
                                    canRemove={
                                      Boolean(isOwner) ||
                                      Boolean(currentUser && participant.userId === currentUser.id)
                                    }
                                    isOwner={Boolean(isOwner)}
                                    authMissing={!currentUser}
                                  />
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="rounded-lg border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                    Пока никто не зарегистрировался. Будьте первым!
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-[28px] font-semibold text-foreground">Требования к авто</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm text-[#6B7280]">Тип автомобиля</p>
                  <p className="text-base font-medium text-[#111827]">
                    {vehicleTypeLabel}
                  </p>
                </div>
                {event.allowedBrands.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-[#6B7280]">Рекомендуемые марки</p>
                    <div className="flex flex-wrap gap-2">
                      {event.allowedBrands.map((brand) => (
                        <span
                          key={brand.id}
                          className="rounded-full bg-[#F7F7F8] px-3 py-1 text-sm font-medium text-[#374151]"
                        >
                          {brand.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {ownerUser && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-[28px] font-semibold text-foreground">Организатор</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-base font-medium text-[#111827]">
                    {ownerUser.name || ownerUser.telegramHandle || "Организатор"}
                  </p>
                  {ownerUser.telegramHandle && (
                    <p className="text-base text-[#6B7280]">@{ownerUser.telegramHandle}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
