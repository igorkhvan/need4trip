import Link from "next/link";
import { notFound } from "next/navigation";

import { Users, ShieldCheck, Calendar as CalendarIcon, MapPin, Car } from "lucide-react";

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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ParticipantActions } from "@/components/events/participant-actions";
import { OwnerActions } from "@/components/events/owner-actions";
import { RegisterParticipantModal } from "@/components/events/register-participant-modal";
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

function getProgressColor(percent: number) {
  if (percent >= 80) return "bg-[#EF4444]";
  if (percent >= 50) return "bg-[#FF6F2C]";
  return "bg-[#22C55E]";
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
  const isLinkProtected = event.visibility === "link_registered";
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
    any: "Не важно",
    sedan: "Легковой",
    crossover: "Кроссовер",
    suv: "Внедорожник",
  };
  const vehicleTypeLabel = vehicleTypeLabelMap[event.vehicleTypeRequirement] ?? "Не важно";

  const formatCustomValue = (
    value: unknown,
    type: (typeof event.customFieldsSchema)[number]["type"]
  ) => {
    if (value === null || value === undefined || value === "") return "—";
    if (type === "boolean") return value ? "Да" : "Нет";
    return String(value);
  };

  const currentParticipant = currentUser
    ? participants.find((p) => p.userId === currentUser.id)
    : undefined;
  const ownerUser =
    event.createdByUserId ? await getUserById(event.createdByUserId) : null;
  const fillPercent =
    event.maxParticipants && event.maxParticipants > 0
      ? Math.min(100, Math.round((participants.length / event.maxParticipants) * 100))
      : null;

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-5 py-10 md:px-10 lg:px-12">
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" asChild className="px-0 text-sm">
              <Link href="/events">← Назад к списку</Link>
            </Button>
            {ownerUser && (
              <div className="text-right text-xs text-[#6B7280]">
                Организатор: {ownerUser.telegramHandle ? `@${ownerUser.telegramHandle}` : ownerUser.name}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
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
              <h1 className="text-3xl font-semibold leading-tight text-[#111827]">{event.title}</h1>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                  <CalendarIcon className="h-4 w-4" />
                  <span>{formattedDateTime}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                  <MapPin className="h-4 w-4" />
                  <span>{event.locationText}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                  <Users className="h-4 w-4" />
                  <span>{participantsCountLabel}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                  <Car className="h-4 w-4" />
                  <span>{ownerUser?.telegramHandle ? `@${ownerUser.telegramHandle}` : ownerUser?.name ?? "Организатор"}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              {isRegistered ? (
                <>
                  <Badge variant="secondary" className="w-fit bg-[#F0FDF4] text-[#16A34A]">
                    Вы зарегистрированы
                  </Badge>
                  {currentParticipant && (
                    <Button variant="secondary" size="sm" asChild className="rounded-xl">
                      <Link href={`/events/${event.id}/participants/${currentParticipant.id}/edit`}>
                        Редактировать данные
                      </Link>
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  asChild
                  disabled={isFull}
                  className="rounded-xl px-5"
                  title={isFull ? "Достигнут лимит участников" : undefined}
                >
                  <Link href="#register">Присоединиться</Link>
                </Button>
              )}
            </div>
          </div>
          {fillPercent !== null && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6B7280]">Заполнено мест</span>
                <span className="font-medium text-[#111827]">{fillPercent}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#F3F4F6]">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${getProgressColor(fillPercent)}`}
                  style={{ width: `${fillPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {(!currentUser || isLinkProtected) && (
        <Alert>
          {!currentUser ? (
            <>
              <AlertTitle>Нужна авторизация</AlertTitle>
              <AlertDescription>
                Войдите через Telegram, чтобы зарегистрировать свой экипаж и получать обновления по событию.
              </AlertDescription>
            </>
          ) : isLinkProtected ? (
            <>
              <AlertTitle>Приватный ивент по ссылке</AlertTitle>
              <AlertDescription>
                Вы авторизованы и получили доступ. Продолжайте к регистрации.
              </AlertDescription>
            </>
          ) : null}
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">Описание</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-base leading-relaxed text-foreground">{event.description}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">Параметры поездки</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-3 rounded-lg border bg-background px-3 py-2">
              <Users className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Максимум экипажей</p>
                <p className="font-medium text-foreground">
                  {event.maxParticipants ?? "не ограничено"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border bg-background px-3 py-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Требования к авто</p>
                <p className="font-medium text-foreground">{vehicleTypeLabel}</p>
              </div>
            </div>
            {event.allowedBrands.length > 0 && (
              <div className="flex items-start gap-3 rounded-lg border bg-background px-3 py-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Рекомендованные марки</p>
                  <p className="font-medium text-foreground">
                    {event.allowedBrands.map((b) => b.name).join(", ")}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {event.rules && event.rules.trim().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">Правила поездки</CardTitle>
            <CardDescription>
              Ознакомьтесь с правилами перед регистрацией.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
              {event.rules}
            </p>
          </CardContent>
        </Card>
      )}

      <section
        id="register"
        className="space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm md:p-8"
      >
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-[#111827]">Регистрация экипажа</h2>
          <p className="text-sm text-[#6B7280]">
            Укажите данные экипажа. После отправки вы появитесь в списке участников.
          </p>
        </div>
        {isFull ? (
          <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            Регистрация закрыта: достигнуто максимальное количество участников (
            {event.maxParticipants}).
          </div>
        ) : isRegistered && currentParticipant ? (
          <Alert>
            <AlertTitle>Вы уже зарегистрированы</AlertTitle>
            <AlertDescription>
              Ваш профиль уже есть в списке участников этого ивента.
            </AlertDescription>
            <div className="mt-3">
              <Button size="sm" variant="secondary" asChild>
                <Link
                  href={`/events/${event.id}/participants/${currentParticipant.id}/edit`}
                >
                  Редактировать данные экипажа
                </Link>
              </Button>
            </div>
          </Alert>
        ) : isLinkProtected && !currentUser ? (
          <Alert>
            <AlertTitle>Приватный ивент</AlertTitle>
            <AlertDescription>
              Регистрация доступна только авторизованным пользователям.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <RegisterParticipantModal
              eventId={event.id}
              customFieldsSchema={event.customFieldsSchema}
              event={event}
              triggerLabel="Открыть форму"
            />
            <div className="text-xs text-[#6B7280]">
              Форма откроется во всплывающем окне. Данные отправятся сразу после нажатия «Сохранить».
            </div>
          </div>
        )}
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl font-semibold text-foreground">Участники</CardTitle>
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

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">Управление событием</CardTitle>
            <CardDescription>
              Редактируйте карточку события или удалите его при необходимости.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OwnerActions eventId={event.id} isOwner authMissing={!currentUser} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
