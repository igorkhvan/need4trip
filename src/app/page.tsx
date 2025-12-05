import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { listEventsSafe } from "@/lib/services/events";

type EventSummary = {
  id: string;
  title: string;
  startsAt: string;
  typeLabel?: string | null;
  description?: string | null;
};

function formatEventMeta(event: EventSummary): string {
  const d = new Date(event.startsAt);
  const dateStr = d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${dateStr} • ${event.typeLabel ?? "Ивент"}`;
}

const features: { title: string; description: string }[] = [
  {
    title: "Создание выездов и тренировок",
    description: "Планируйте покатушки, сервис-дни и встречи клуба.",
  },
  {
    title: "Регистрация экипажей с нужными полями",
    description: "Настраивайте любые параметры: рация, резина, опыт, количество человек.",
  },
  {
    title: "Лимиты и контроль участников",
    description: "Задавайте max экипажей или оставляйте набор открытым.",
  },
  {
    title: "Роли в колонне",
    description: "Назначайте лидера, замыкающего и управляйте порядком движения.",
  },
  {
    title: "Гибкие кастомные поля",
    description: "Собирайте только нужные данные от участников в удобной форме.",
  },
  {
    title: "Прозрачное управление",
    description: "Следите за составом колонны и обновляйте данные в пару кликов.",
  },
];

function Hero() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <span className="inline-flex w-auto items-center rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-secondary-foreground">
          Для оффроад-клубов и организаторов 4x4 выездов
        </span>
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Организация оффроад-покатушек и учет экипажей в пару кликов
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl">
            Need4Trip помогает лидерам клубов и организаторам выездов собирать экипажи, настраивать поля регистрации и управлять колонной в одном удобном интерфейсе.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
        <Button asChild>
          <Link href="/events/create">Создать первый ивент</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/events">Смотреть ивенты</Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Бесплатно · авторизация через Telegram · 2 минуты
      </p>
    </section>
  );
}

function HowItWorksSection() {
  const items = [
    {
      title: "Создаёте ивент",
      description: "Указываете название, дату, тип выезда и требования к машине.",
    },
    {
      title: "Настраиваете регистрацию",
      description:
        "Добавляете свои поля: рация, резина, опыт, количество людей в экипаже.",
    },
    {
      title: "Собираете экипажи",
      description:
        "Участники регистрируются через удобную форму, вы видите колонну и роли.",
    },
  ];

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Как это работает</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Простой процесс для организаторов и экипажей: от создания события до управления колонной.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <Card key={item.title} className="h-full">
            <CardHeader>
              <CardTitle className="text-base font-semibold">{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Что уже умеет Need4Trip</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Need4Trip — инструмент для организации выездов, учёта экипажей и управления клубными ивентами.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {features.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle className="text-base font-semibold">{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}

function UpcomingEventsSection({ events }: { events: EventSummary[] }) {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between gap-2">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Ближайшие ивенты</h2>
          <p className="text-sm text-muted-foreground">
            Несколько ближайших выездов. Полный список — на отдельной странице.
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/events">Все ивенты →</Link>
        </Button>
      </div>

      <div className="space-y-3">
        {events.length === 0 ? (
          <div className="rounded-lg border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
            Пока нет ближайших ивентов.
          </div>
        ) : (
          events.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <CardTitle className="text-base font-semibold">{event.title}</CardTitle>
                <CardDescription>{formatEventMeta(event)}</CardDescription>
              </CardHeader>
              {event.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">{event.description}</p>
                </CardContent>
              )}
              <CardFooter>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/events/${event.id}`}>Подробнее</Link>
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </section>
  );
}

export default async function HomePage() {
  const eventsData = await listEventsSafe();
  const events: EventSummary[] = eventsData.slice(0, 3).map((e) => ({
    id: e.id,
    title: e.title,
    startsAt: e.dateTime,
    typeLabel: e.category ?? "Ивент",
    description: e.description ?? null,
  }));

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-12">
      <Hero />
      <HowItWorksSection />
      <Features />
      <UpcomingEventsSection events={events} />
      <footer className="pt-8">
        <p className="text-xs text-muted-foreground">Need4Trip · бета-версия.</p>
      </footer>
    </div>
  );
}
