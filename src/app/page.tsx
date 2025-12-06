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
    title: "Создание поездок и встреч",
    description: "Планируйте любые автопоездки: выходные, встречи клуба, сервис-дни.",
  },
  {
    title: "Регистрация экипажей по вашим правилам",
    description: "Настраивайте поля: контакты, опыт, авто, количество людей.",
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
    <section className="rounded-xl border bg-card p-6 shadow-sm md:p-8">
      <div className="space-y-6">
        <div className="space-y-3">
          <span className="inline-flex w-auto items-center rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Для клубов и организаторов автопоездок
          </span>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Организация автомобильных поездок и учёт экипажей в пару кликов
            </h1>
            <p className="max-w-3xl text-base text-muted-foreground">
              Need4Trip помогает лидерам клубов и организаторам поездок собирать экипажи, настраивать регистрацию и управлять колонной в удобном интерфейсе.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
          <Button asChild className="h-12 rounded-lg px-6">
            <Link href="/events/create">Создать ивент</Link>
          </Button>
          <Button variant="outline" asChild className="h-12 rounded-lg px-6">
            <Link href="/events">Смотреть ивенты</Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Бесплатно · авторизация через Telegram · 2 минуты на старт
        </p>
      </div>
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
    <section className="space-y-5">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Как это работает</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Простой путь от создания события до управления списком экипажей.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <Card key={item.title} className="h-full border border-border/70">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">{item.title}</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">{item.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Что умеет Need4Trip</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Сервис для организации поездок, учёта экипажей и управления событиями клуба.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {features.map((item) => (
          <Card key={item.title} className="border border-border/70">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">{item.title}</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">{item.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}

function UpcomingEventsSection({ events }: { events: EventSummary[] }) {
  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Ближайшие ивенты</h2>
          <p className="text-sm text-muted-foreground">
            Несколько ближайших поездок. Полный список — на отдельной странице.
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/events">Все ивенты →</Link>
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="rounded-lg border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          Пока нет ближайших ивентов.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 sm:grid-cols-2">
          {events.map((event) => (
            <Card key={event.id} className="flex h-full flex-col border border-border/70">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">{event.title}</CardTitle>
                <CardDescription>{formatEventMeta(event)}</CardDescription>
              </CardHeader>
              {event.description && (
                <CardContent>
                  <p className="line-clamp-3 text-sm text-muted-foreground">{event.description}</p>
                </CardContent>
              )}
              <CardFooter className="mt-auto flex justify-between">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/events/${event.id}`}>Подробнее</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
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
    <div className="container mx-auto max-w-6xl space-y-14 px-4 py-12 md:px-6">
      <Hero />
      <HowItWorksSection />
      <Features />
      <UpcomingEventsSection events={events} />
      <footer className="pt-6">
        <p className="text-xs text-muted-foreground">Need4Trip · бета-версия.</p>
      </footer>
    </div>
  );
}
