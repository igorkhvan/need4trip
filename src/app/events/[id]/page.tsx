import Link from "next/link";
import { notFound } from "next/navigation";

import { MapPin, Users, ShieldCheck, BadgeDollarSign } from "lucide-react";

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
import { RegisterParticipantForm } from "@/components/events/register-participant-form";
import { ParticipantActions } from "@/components/events/participant-actions";
import { OwnerActions } from "@/components/events/owner-actions";
import { getEventWithParticipants } from "@/lib/services/events";
import { EventCategory } from "@/lib/types/event";
import { getCurrentUserSafe } from "@/lib/auth/currentUser";
import { grantEventAccessByLink } from "@/lib/services/events";

const CATEGORY_LABELS: Record<EventCategory, string> = {
  weekend_trip: "Выезд на выходные",
  technical_ride: "Техническая покатушка",
  meeting: "Встреча",
  training: "Тренировка",
  service_day: "Сервис-день",
  other: "Другое",
};

export default async function EventDetails({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const { id } = await params;
  const { event, participants } = await getEventWithParticipants(id);
  if (!event) return notFound();
  const currentUser = await getCurrentUserSafe();
  const isLinkProtected = event.visibility === "link_registered";
  if (currentUser && isLinkProtected) {
    await grantEventAccessByLink(event.id, currentUser.id);
  }
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
  const formattedDateTime = new Date(event.dateTime).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
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

  return (
    <div className="container mx-auto max-w-5xl space-y-8 py-8 px-4">
      <div className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <span>{categoryLabel ?? "Ивент"}</span>
              <span>· {formattedDateTime}</span>
              <span>· {participantsCountLabel}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{event.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              {isOwner && <Badge variant="outline">Владелец</Badge>}
              {event.isClubEvent && <Badge variant="secondary">Клубное событие</Badge>}
              <Badge variant={event.isPaid ? "default" : "outline"}>
                {event.isPaid ? "Платное" : "Бесплатное"}
              </Badge>
              <Badge variant="outline">{vehicleTypeLabel}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Локация: {event.locationText}</p>
          </div>
          <div className="flex flex-col items-start gap-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                asChild
                disabled={isFull || isRegistered}
                title={isFull ? "Достигнут лимит участников" : undefined}
              >
                <Link href="#register">
                  {isFull ? "Регистрация закрыта" : isRegistered ? "Вы зарегистрированы" : "Присоединиться"}
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/events">← Назад к списку</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Авторизация и регистрация проходят через Telegram. Это займёт 1–2 минуты.
            </p>
          </div>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-foreground">Описание</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="prose prose-sm text-muted-foreground leading-relaxed">
            {event.description}
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
              <Users className="h-4 w-4" />
              <span>Максимум участников: {event.maxParticipants ?? "не ограничено"}</span>
            </div>
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
              <MapPin className="h-4 w-4" />
              <span>{event.locationText}</span>
            </div>
            {event.vehicleTypeRequirement !== "any" && (
              <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                <ShieldCheck className="h-4 w-4" />
                <span>Тип машины: {vehicleTypeLabel}</span>
              </div>
            )}
            {event.isPaid && (
              <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                <BadgeDollarSign className="h-4 w-4" />
                <span>
                  {event.price ? `Стоимость: ${event.price} ${event.currency ?? ""}` : "Платное"}
                </span>
              </div>
            )}
          </div>
          {event.allowedBrands.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Рекомендуемые марки: {event.allowedBrands.map((b) => b.name).join(", ")}
            </div>
          )}
        </CardContent>
      </Card>

      {event.rules && event.rules.trim().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">Правила и регламент</CardTitle>
            <CardDescription>
              Ознакомьтесь с регламентом, это обязательная информация для участников.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
              {event.rules}
            </p>
          </CardContent>
        </Card>
      )}

      <Card id="register">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-foreground">Регистрация</CardTitle>
          <CardDescription>
            Заполните данные экипажа — это займёт 1–2 минуты. После отправки вы появитесь в списке участников.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isFull ? (
            <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              Регистрация закрыта: достигнуто максимальное количество участников (
              {event.maxParticipants}).
            </div>
          ) : isRegistered ? (
            <Alert>
              <AlertTitle>Вы уже зарегистрированы</AlertTitle>
              <AlertDescription>
                Ваш профиль уже есть в списке участников этого ивента. Отредактируйте запись внизу,
                если нужно обновить данные.
              </AlertDescription>
            </Alert>
          ) : isLinkProtected && !currentUser ? (
            <Alert>
              <AlertTitle>Приватный ивент</AlertTitle>
              <AlertDescription>
                Регистрация доступна только авторизованным пользователям. Войдите через Telegram.
              </AlertDescription>
            </Alert>
          ) : (
            <RegisterParticipantForm
              eventId={event.id}
              customFieldsSchema={event.customFieldsSchema}
              event={event}
            />
          )}
          {!currentUser && (
            <p className="text-xs text-muted-foreground">
              Авторизация занимает до 2 минут. Никаких паролей — только Telegram.
            </p>
          )}
        </CardContent>
      </Card>

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
