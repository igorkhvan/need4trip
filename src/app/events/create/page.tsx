 "use client";

export const dynamic = "force-dynamic";

import { EventForm } from "@/components/events/event-form";
import { handleApiError } from "@/lib/utils/errors";

export default function CreateEventPage() {
  const handleSubmit = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      await handleApiError(res);
    }
  };

  return (
    <EventForm
      mode="create"
      backHref="/events"
      submitLabel="Создать событие"
      headerTitle="Создание события"
      headerDescription="Заполните информацию о вашей автомобильной поездке"
      onSubmit={handleSubmit}
    />
  );
}
