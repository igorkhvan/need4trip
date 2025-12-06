import Link from "next/link";

import { EventsTable } from "@/components/events/events-table";
import { Button } from "@/components/ui/button";
import { listVisibleEventsForUser } from "@/lib/services/events";
import { getCurrentUserSafe } from "@/lib/auth/currentUser";

function PageHeader() {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#E86223]">
          События клуба
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#111827]">Все ивенты</h1>
        <p className="text-base text-[#6B7280]">
          Выезды, тренировки и встречи. Зарегистрируйтесь на ближайший или создайте свой.
        </p>
      </div>
      <Button size="sm" asChild className="h-11 rounded-xl px-5 text-base shadow-sm">
        <Link href="/events/create">Создать ивент</Link>
      </Button>
    </header>
  );
}

export default async function EventsPage() {
  const currentUser = await getCurrentUserSafe();
  const events = await listVisibleEventsForUser(currentUser?.id ?? null);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-5 py-12 md:px-10 lg:px-12">
      <PageHeader />
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm md:p-6">
        <EventsTable events={events} />
      </div>
    </div>
  );
}
