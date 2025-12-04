import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Ивент</p>
          <h1 className="text-3xl font-semibold">{event.title}</h1>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>🗓 {new Date(event.dateTime).toLocaleString("ru-RU")}</span>
            <span>📍 {event.locationText}</span>
            {event.category && (
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                {CATEGORY_LABELS[event.category]}
              </span>
            )}
            {isOwner && <Badge variant="outline">Владелец события</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/events">Назад к списку</Link>
          </Button>
          <Button asChild>
            <Link href={`/events/${event.id}#register`}>Регистрация</Link>
          </Button>
          <OwnerActions eventId={event.id} isOwner={isOwner} authMissing={!currentUser} />
        </div>
      </div>

      {!currentUser && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="font-semibold">Вы не авторизованы</div>
          <div>Войдите через Telegram, чтобы управлять ивентом и регистрациями.</div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Описание</CardTitle>
          <CardDescription>Детали ивента из Supabase.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{event.description}</p>
          <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            Максимум участников: {event.maxParticipants ?? "не ограничено"}
          </div>
          {event.customFieldsSchema.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                Необходимая информация при регистрации
              </h3>
              <div className="overflow-hidden rounded-xl border bg-background">
                <table className="min-w-full divide-y text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr className="text-left">
                      <th className="px-4 py-2 font-semibold">Поле</th>
                      <th className="px-4 py-2 font-semibold">Тип</th>
                      <th className="px-4 py-2 font-semibold">Обязательное</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {event.customFieldsSchema.map((field) => (
                      <tr key={field.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{field.label}</td>
                        <td className="px-4 py-3 capitalize text-muted-foreground">{field.type}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {field.required ? "да" : "нет"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card id="register">
        <CardHeader>
          <CardTitle>Участники</CardTitle>
          <CardDescription>Регистрация участников хранится в Supabase.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {participants.length ? null : (
            <div className="rounded-lg border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
              Пока нет участников.
            </div>
          )}
          {participants.length ? (
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full divide-y text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="px-4 py-2 font-semibold">Экипаж</th>
                    <th className="px-4 py-2 font-semibold">Роль</th>
                    <th className="px-4 py-2 font-semibold">Пользователь</th>
                    {(isOwner || currentUser) && (
                      <th className="px-4 py-2 font-semibold">Действия</th>
                    )}
                    {sortedCustomFields.map((field) => (
                      <th key={field.id} className="px-4 py-2 font-semibold">
                        {field.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {participants.map((participant) => (
                    <tr key={participant.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2 font-medium">
                        <div className="flex flex-col gap-1">
                          <span>{participant.displayName}</span>
                          <div className="flex flex-wrap gap-1">
                            <Badge className="bg-slate-100 text-slate-800" variant="outline">
                              {participant.userId ? "Пользователь" : "Гость"}
                            </Badge>
                            {participant.userId === event.createdByUserId && (
                              <Badge variant="secondary">Владелец</Badge>
                            )}
                            {participant.role === "leader" && (
                              <Badge className="bg-emerald-100 text-emerald-800" variant="outline">
                                Лидер
                              </Badge>
                            )}
                            {participant.role === "tail" && (
                              <Badge className="bg-amber-100 text-amber-800" variant="outline">
                                Замыкающий
                              </Badge>
                            )}
                            {participant.role === "participant" && (
                              <Badge className="bg-slate-100 text-slate-800" variant="outline">
                                Участник
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 capitalize">{participant.role}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {participant.userId ?? "гость"}
                      </td>
                      {(isOwner || currentUser) && (
                        <td className="px-4 py-2 text-muted-foreground">
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
                        </td>
                      )}
                      {sortedCustomFields.map((field) => (
                        <td key={field.id} className="px-4 py-2 text-muted-foreground">
                          {formatCustomValue(
                            participant.customFieldValues?.[field.id],
                            field.type
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
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
