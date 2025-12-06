 "use client";

export const dynamic = "force-dynamic";

import { EventForm } from "@/components/events/event-form";

export default function CreateEventPage() {
  const handleSubmit = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/events", {
      method: "POST",
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
      const errMessage = body?.message || body?.error || "Не удалось создать ивент";
      throw new Error(errMessage);
    }
  };

  return (
    <EventForm
      mode="create"
      backHref="/events"
      submitLabel="Сохранить ивент"
      headerTitle="Создание ивента"
      headerDescription="Опишите покатушку, добавьте кастомные поля для регистрации экипажей."
      onSubmit={handleSubmit}
    />
  );
}
