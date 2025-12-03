import Link from "next/link";

import { EventsTable } from "@/components/events/events-table";
import { Button } from "@/components/ui/button";
import { listEvents } from "@/lib/services/events";

export default async function EventsPage() {
  const events = await listEvents();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Ивенты клуба</h1>
          <p className="text-muted-foreground">
            Список будущих и прошлых покатушек. Можно отсортировать по дате, названию или
            категории.
          </p>
        </div>
        <Button asChild>
          <Link href="/events/create">Создать ивент</Link>
        </Button>
      </div>

      <EventsTable events={events} />
    </div>
  );
}
