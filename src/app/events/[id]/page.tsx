import Link from "next/link";
import { notFound } from "next/navigation";

import { Calendar, MapPin, Users, Clock3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RegisterParticipantForm } from "@/components/events/register-participant-form";
import { OwnerActions } from "@/components/events/owner-actions";
import { ParticipantActions } from "@/components/events/participant-actions";
import { getEventWithParticipants } from "@/lib/services/events";
import { EventCategory } from "@/lib/types/event";
import { getCurrentUser } from "@/lib/auth/currentUser";

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
  const currentUser = await getCurrentUser();
  const isOwner = currentUser?.id === event.createdByUserId;
  const isFull =
    event.maxParticipants !== null &&
    event.maxParticipants !== undefined &&
    participants.length >= event.maxParticipants;
  const sortedCustomFields = [...(event.customFieldsSchema || [])].sort(
    (a, b) => a.order - b.order
  );

  const subtitle =
    event.description?.split(".")[0]?.trim() && event.description.length > 0
      ? `${event.description.split(".")[0].trim()}.`
      : null;
  const categoryLabel = event.category ? CATEGORY_LABELS[event.category] : null;

  const formatCustomValue = (
    value: unknown,
    type: (typeof event.customFieldsSchema)[number]["type"]
  ) => {
    if (value === null || value === undefined || value === "") return "—";
    if (type === "boolean") return value ? "Да" : "Нет";
    return String(value);
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-none bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-200/80">
                {categoryLabel && (
                  <Badge variant="secondary" className="bg-white/10 text-white">
                    {categoryLabel}
                  </Badge>
                )}
                {isOwner && (
                  <Badge variant="outline" className="border-white/30 text-white">
                    Владелец
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">Ивент</p>
                <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
                  {event.title}
                </h1>
                {subtitle && <p className="text-base text-white/80">{subtitle}</p>}
              </div>
              <div className="grid gap-3 text-sm text-white/80 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(event.dateTime).toLocaleString("ru-RU")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{event.locationText}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>
                    {participants.length} участников
                    {event.maxParticipants ? ` / лимит ${event.maxParticipants}` : ""}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-stretch gap-3 md:items-end">
              <div className="flex flex-wrap gap-2">
                <Button size="lg" variant="secondary" asChild className="px-6">
                  <Link href="/events">Назад</Link>
                </Button>
                {isOwner ? (
                  <Button size="lg" className="px-6" asChild>
                    <Link href={`/events/${event.id}/edit`}>Редактировать событие</Link>
                  </Button>
                ) : (
                  <Button size="lg" className="px-6" asChild>
                    <Link href={`/events/${event.id}#register`}>Записаться</Link>
                  </Button>
                )}
              </div>
              <OwnerActions eventId={event.id} isOwner={isOwner} authMissing={!currentUser} />
            </div>
          </div>
        </CardContent>
      </Card>

      {!currentUser && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="font-semibold">Вы не авторизованы</div>
          <div>Войдите через Telegram, чтобы управлять ивентом и регистрациями.</div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Описание</CardTitle>
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
          </div>
          {event.customFieldsSchema.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                Необходимая информация при регистрации
              </h3>
              <div className="overflow-hidden rounded-xl border bg-background">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="font-semibold">Поле</TableHead>
                      <TableHead className="font-semibold">Тип</TableHead>
                      <TableHead className="font-semibold">Обязательное</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {event.customFieldsSchema.map((field) => (
                      <TableRow key={field.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{field.label}</TableCell>
                        <TableCell className="capitalize text-muted-foreground">
                          {field.type}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {field.required ? "да" : "нет"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card id="register">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Регистрация и участники</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {participants.length ? (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[22%]">Имя участника</TableHead>
                    <TableHead className="w-[18%]">Телеграм</TableHead>
                    <TableHead className="w-[12%]">Роль</TableHead>
                    <TableHead className="w-[18%]">Время регистрации</TableHead>
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
                        {participant.user?.telegramHandle ??
                          participant.userId ??
                          "—"}
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">
                        {participant.role === "leader"
                          ? "Лидер"
                          : participant.role === "tail"
                            ? "Замыкающий"
                            : "Участник"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4 text-muted-foreground" />
                          {new Date(participant.createdAt).toLocaleString("ru-RU")}
                        </div>
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
              Пока нет участников.
            </div>
          )}
          {isFull ? (
            <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              Регистрация закрыта: достигнуто максимальное количество участников (
              {event.maxParticipants}).
            </div>
          ) : (
            <RegisterParticipantForm
              eventId={event.id}
              customFieldsSchema={event.customFieldsSchema}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
