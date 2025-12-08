"use client";

export const dynamic = "force-dynamic";

import { notFound, useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { EventForm } from "@/components/events/event-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageLoader } from "@/components/ui/spinner";
import { EventCategory, VehicleTypeRequirement, Visibility } from "@/lib/types/event";

type Event = {
  id: string;
  title: string;
  description: string;
  category: EventCategory | null;
  dateTime: string;
  locationText: string;
  maxParticipants: number | null;
  customFieldsSchema: any[];
  visibility: Visibility;
  vehicleTypeRequirement: VehicleTypeRequirement;
  allowedBrands: { id: string; name: string }[];
  rules?: string | null;
  isClubEvent: boolean;
  isPaid: boolean;
  price?: number | null;
  currency?: string | null;
  createdByUserId: string | null;
};

export default function EditEventPage() {
  const params = useParams();
  const id = params.id as string;
  const [event, setEvent] = useState<Event | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvent() {
      try {
        // Fetch current user
        const userRes = await fetch("/api/auth/me");
        const userData = userRes.ok ? await userRes.json() : null;
        setCurrentUserId(userData?.user?.id ?? null);

        // Fetch event with participants
        const eventRes = await fetch(`/api/events/${id}`);
        if (!eventRes.ok) {
          throw new Error("Event not found");
        }
        const data = await eventRes.json();
        setEvent(data.event);
        setParticipantCount(data.participants?.length ?? 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load event");
      } finally {
        setLoading(false);
      }
    }
    loadEvent();
  }, [id]);

  if (loading) return <PageLoader />;
  if (error || !event) return notFound();

  const isOwner = currentUserId === event.createdByUserId;
  const hasParticipants = participantCount > 0;
  const authMissing = !currentUserId;

  const handleSubmit = async (payload: Record<string, unknown>) => {
    if (!isOwner || authMissing) {
      throw new Error("Недостаточно прав / войдите через Telegram");
    }
    const res = await fetch(`/api/events/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        throw new Error("Недостаточно прав / войдите через Telegram");
      }
      if (res.status === 409) {
        throw new Error("Лимит участников достигнут");
      }
      if (res.status === 400) {
        throw new Error(body?.message || "Ошибка валидации");
      }
      throw new Error(body?.message || "Не удалось сохранить событие");
    }
  };

  return (
    <div className="space-y-6">
      {authMissing && (
        <div className="page-container">
          <Alert>
            <AlertTitle>Требуется авторизация</AlertTitle>
            <AlertDescription>
              Войдите через Telegram, чтобы редактировать событие.
            </AlertDescription>
          </Alert>
        </div>
      )}
      {!isOwner && !authMissing && (
        <div className="page-container">
          <Alert variant="destructive">
            <AlertTitle>Нет прав</AlertTitle>
            <AlertDescription>
              Только владелец может редактировать это событие.
            </AlertDescription>
          </Alert>
        </div>
      )}
      <EventForm
        mode="edit"
        backHref={`/events/${id}`}
        submitLabel="Сохранить изменения"
        headerTitle="Редактирование события"
        headerDescription="Обновите параметры события. Изменения сразу будут видны участникам."
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
        onSubmit={handleSubmit}
      />
    </div>
  );
}
