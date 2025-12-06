"use client";

import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EventForm } from "@/components/events/event-form";
import { EventCategory, VehicleTypeRequirement, Visibility } from "@/lib/types/event";

interface EditEventFormProps {
  event: {
    id: string;
    title: string;
    description: string;
    category: EventCategory | null;
    dateTime: string;
    locationText: string;
    maxParticipants: number | null;
    customFieldsSchema: ReturnType<typeof JSON.parse>[];
    visibility: Visibility;
    vehicleTypeRequirement: VehicleTypeRequirement;
    allowedBrands: { id: string; name: string }[];
    rules?: string | null;
    isClubEvent: boolean;
    isPaid: boolean;
    price?: number | null;
    currency?: string | null;
  };
  hasParticipants: boolean;
  isOwner: boolean;
  authMissing: boolean;
  formattedDateTime: string;
}

const CATEGORY_LABELS: Record<EventCategory, string> = {
  weekend_trip: "Выезд на выходные",
  technical_ride: "Техническая покатушка",
  meeting: "Встреча",
  training: "Тренировка",
  service_day: "Сервис-день",
  other: "Другое",
};

export function EditEventForm({
  event,
  hasParticipants,
  isOwner,
  authMissing,
  formattedDateTime,
}: EditEventFormProps) {
  const headerDescription = `${formattedDateTime} • ${
    event.category ? CATEGORY_LABELS[event.category] ?? "Ивент" : "Ивент"
  }`;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-5 py-10 md:px-10 lg:px-12">
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#E86223]">Редактирование</p>
            <h1 className="text-3xl font-semibold leading-tight text-[#111827]">
              {event.title}
            </h1>
            <p className="text-sm text-[#6B7280]">{headerDescription}</p>
            <p className="text-sm text-[#6B7280]">
              Обновите параметры ивента. Изменения сразу будут видны участникам.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {event.isClubEvent && (
                <span className="rounded-full bg-[#F0FDF4] px-3 py-1 text-[13px] font-medium text-[#16A34A]">
                  Клубное событие
                </span>
              )}
              <span
                className={`rounded-full px-3 py-1 text-[13px] font-medium ${
                  event.isPaid ? "bg-[#FFF4EF] text-[#E86223]" : "bg-[#E5E7EB] text-[#374151]"
                }`}
              >
                {event.isPaid ? "Платное" : "Бесплатное"}
              </span>
            </div>
          </div>
          <Link
            className="text-sm text-[#6B7280] underline-offset-4 hover:text-[#111827] hover:underline"
            href={`/events/${event.id}`}
          >
            ← Назад к событию
          </Link>
        </div>
      </div>

      {authMissing && (
        <Alert>
          <AlertTitle>Требуется авторизация</AlertTitle>
          <AlertDescription>Войдите через Telegram, чтобы редактировать ивент.</AlertDescription>
        </Alert>
      )}
      {!isOwner && (
        <Alert variant="destructive">
          <AlertTitle>Нет прав</AlertTitle>
          <AlertDescription>Только владелец может редактировать этот ивент.</AlertDescription>
        </Alert>
      )}

      <EventForm
        mode="edit"
        backHref={`/events/${event.id}`}
        submitLabel="Сохранить ивент"
        headerTitle={`Редактирование: ${event.title}`}
        headerDescription="Обновите ключевые параметры ивента. Изменения сразу будут видны участникам."
        disableCustomFields={hasParticipants}
        disabled={authMissing || !isOwner}
        initialValues={{
          title: event.title,
          description: event.description,
          category: event.category,
          dateTime: event.dateTime,
          locationText: event.locationText,
          maxParticipants: event.maxParticipants,
          customFieldsSchema: event.customFieldsSchema,
          visibility: event.visibility,
          vehicleTypeRequirement: event.vehicleTypeRequirement,
          allowedBrandIds: event.allowedBrands.map((b) => b.id),
          rules: event.rules ?? "",
          isClubEvent: event.isClubEvent,
          isPaid: event.isPaid,
          price: event.price ? String(event.price) : "",
          currency: event.currency ?? "KZT",
        }}
        onSubmit={async (payload) => {
          if (!isOwner || authMissing) {
            throw new Error("Недостаточно прав / войдите через Telegram");
          }
          const res = await fetch(`/api/events/${event.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
              throw new Error("Недостаточно прав / войдите через Telegram");
            }
            if (res.status === 409) {
              throw new Error("Лимит участников достигнут");
            }
            if (res.status === 400) {
              const body = await res.json().catch(() => ({}));
              throw new Error(body?.message || "Ошибка валидации");
            }
            const body = await res.json().catch(() => ({}));
            throw new Error(body?.message || "Не удалось сохранить ивент");
          }
        }}
      />
    </div>
  );
}
