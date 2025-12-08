import Link from "next/link";
import { notFound } from "next/navigation";

import { Users, Calendar as CalendarIcon, MapPin, Car, PencilLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";
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

const CATEGORY_CHIP_CLASSES: Record<EventCategory, string> = {
  weekend_trip: "bg-[#FF6F2C] text-white",
  technical_ride: "bg-[#3B82F6] text-white",
  meeting: "bg-[#8B5CF6] text-white",
  training: "bg-[#FBBF24] text-white",
  service_day: "bg-[#0EA5E9] text-white",
  other: "bg-[#374151] text-white",
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
    <div className="py-10 md:py-16">
      <div className="page-container space-y-8">
        <div className="flex flex-col gap-6">
          <Button variant="ghost" size="sm" asChild className="w-fit">
            <Link href="/events">← Назад к событиям</Link>
          </Button>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <h1 className="text-4xl font-bold leading-tight text-[#111827] md:text-5xl">{event.title}</h1>
              <div className="flex flex-wrap items-center gap-3">
                {isRegistered ? (
                  <>
                    <Badge variant="success" className="w-fit">
                      Вы зарегистрированы
                    </Badge>
                    {currentParticipant && (
                      <ParticipantModal
                        mode="edit"
                        eventId={event.id}
                        participantId={currentParticipant.id}
                        customFieldsSchema={event.customFieldsSchema}
                        event={event}
                        initialValues={{
                          displayName: currentParticipant.displayName,
                          role: currentParticipant.role,
                          customFieldValues: currentParticipant.customFieldValues,
                        }}
                        triggerLabel="Редактировать данные"
                      />
                    )}
                  </>
                ) : isFull ? (
                  <Badge variant="warning" className="w-fit">
                    Лимит участников достигнут
                  </Badge>
                ) : (
                  <ParticipantModal
                    mode="create"
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

            <div className="flex flex-wrap items-center gap-2">
              {categoryLabel && event.category ? (
                <Chip className={CATEGORY_CHIP_CLASSES[event.category]}>{categoryLabel}</Chip>
              ) : null}
              {event.isClubEvent && <Chip variant="success">Клубное событие</Chip>}
              <Chip variant="outline">{event.isPaid ? "Платное" : "Бесплатное"}</Chip>
              <Chip variant="outline">{vehicleTypeLabel}</Chip>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-base text-[#6B7280]">
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-5 w-5 flex-shrink-0" />
                <span>{formattedDateTime}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 flex-shrink-0" />
                <span>{event.locationText}</span>
              </div>
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 flex-shrink-0" />
                <span>{participantsCountLabel}</span>
              </div>
              <div className="flex items-center gap-3">
                <Car className="h-5 w-5 flex-shrink-0" />
                <span>{ownerUser?.telegramHandle ? `@${ownerUser.telegramHandle}` : ownerUser?.name ?? "Организатор"}</span>
              </div>
            </div>
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
                <CardTitle>Описание</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-base leading-relaxed text-[#374151]">{event.description}</p>
              </CardContent>
            </Card>

            {event.rules && event.rules.trim().length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Правила участия</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line text-base leading-relaxed text-[#374151]">
                    {event.rules}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Участники ({participants.length})</CardTitle>
                  <CardDescription className="text-sm text-[#6B7280]">{participantsCountLabel}</CardDescription>
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
                                    customFieldsSchema={event.customFieldsSchema}
                                    event={event}
                                    participantData={{
                                      displayName: participant.displayName,
                                      role: participant.role,
                                      customFieldValues: participant.customFieldValues,
                                    }}
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
            {event.isPaid && (
              <Card>
                <CardHeader>
                  <CardTitle>Стоимость участия</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-4xl font-bold text-[#111827]">
                    {event.price ?? 0} {event.currency ?? ""}
                  </p>
                  <p className="text-sm text-[#6B7280]">за экипаж</p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Требования к авто</CardTitle>
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
                  <CardTitle>Организатор</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-base font-semibold text-[#111827]">
                    {ownerUser.name || ownerUser.telegramHandle || "Организатор"}
                  </p>
                  {ownerUser.telegramHandle && (
                    <p className="text-sm text-[#6B7280]">@{ownerUser.telegramHandle}</p>
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
