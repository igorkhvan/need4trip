import Link from "next/link";

import { EventCard } from "@/components/events/event-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listEvents } from "@/lib/services/events";

export default async function Home() {
  const events = await listEvents();
  const upcoming = events.slice(0, 3);

  return (
    <div className="space-y-10">
      <section className="grid gap-8 rounded-2xl border bg-card p-8 shadow-sm md:grid-cols-[2fr,1.2fr]">
        <div className="space-y-4">
          <div className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-secondary-foreground">
            Need4Trip
          </div>
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
            Организация покатушек и регистрация экипажей в пару кликов
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Создавайте выезды, собирайте участников с нужными атрибутами и держите
            всю информацию об оффроуд-клубе в одном месте.
          </p>
          <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/events/create">Создать ивент</Link>
          </Button>
            <Button asChild variant="ghost">
              <Link href="/events">Смотреть ивенты</Link>
            </Button>
          </div>
        </div>
        <Card className="bg-gradient-to-br from-orange-50 via-white to-slate-50">
          <CardContent className="space-y-4 p-6">
            <div className="text-sm font-semibold text-orange-600">
              Что готово сейчас:
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Типы ивентов: выезд, встреча, тренировка</li>
              <li>• Кастомные поля регистрации участников</li>
              <li>• API хендлеры на Next.js + Supabase</li>
              <li>• База данных и анонимный доступ (RLS off в деве)</li>
            </ul>
            <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              Подключите свои Supabase ключи — данные уже пишутся в Postgres.
              Дальше можно расширять авторизацию и проверки бизнес-логики.
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Ближайшие ивенты</h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/events">Все ивенты</Link>
          </Button>
        </div>
        {upcoming.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {upcoming.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border bg-card px-4 py-8 text-center text-muted-foreground">
            Пока пусто — создайте первый выезд.
          </div>
        )}
      </section>
    </div>
  );
}
