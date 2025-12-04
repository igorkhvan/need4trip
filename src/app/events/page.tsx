import Link from "next/link";

import { EventsTable } from "@/components/events/events-table";
import { Button } from "@/components/ui/button";
import { listEvents } from "@/lib/services/events";

function PageHeader() {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Ивенты</h1>
        <p className="text-sm text-muted-foreground">Список выездов, тренировок и встреч клуба.</p>
      </div>
      <Button size="sm" asChild>
        <Link href="/events/create">Создать ивент</Link>
      </Button>
    </header>
  );
}

export default async function EventsPage() {
  const events = await listEvents();

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
      <PageHeader />
      <EventsTable events={events} />
    </div>
  );
}
