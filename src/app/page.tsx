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
    <section className="overflow-hidden rounded-2xl border bg-gradient-to-b from-white to-[#F7F7F8] p-10 shadow-sm md:p-16">
      <div className="flex flex-col items-center gap-6 text-center">
        <span className="inline-flex items-center rounded-full bg-[#FFF4EF] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#E86223]">
          Для клубов и организаторов автопоездок
        </span>
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
            Организация автомобильных поездок и учёт экипажей в пару кликов
          </h1>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            Need4Trip помогает клубам и организаторам поездок собирать экипажи, настраивать регистрацию и управлять колонной в удобном интерфейсе.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Button asChild className="h-12 rounded-lg px-6 text-base">
            <Link href="/events/create">Создать ивент</Link>
          </Button>
          <Button variant="outline" asChild className="h-12 rounded-lg px-6 text-base">
            <Link href="/events">Посмотреть ивенты</Link>
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
      title: "Создайте событие",
      description: "Укажите детали поездки, требования к авто и настройте форму регистрации.",
    },
    {
      title: "Поделитесь ссылкой",
      description: "Отправьте ссылку участникам в Telegram или других мессенджерах.",
    },
    {
      title: "Управляйте экипажами",
      description: "Следите за регистрациями, формируйте колонну и роли участников.",
    },
  ];

  return (
    <section className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-semibold tracking-tight">Как это работает</h2>
        <p className="text-sm text-muted-foreground">
          Три простых шага для организации вашей автомобильной поездки
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item, index) => (
          <Card key={item.title} className="h-full border border-border/70">
            <CardHeader className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFF4EF] text-base font-semibold text-[#E86223]">
                {index + 1}
              </div>
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
      <section className="overflow-hidden rounded-2xl bg-[#FF6F2C] px-6 py-14 text-center text-white shadow-md md:px-10">
        <div className="space-y-4">
          <h2 className="text-3xl font-semibold">Готовы начать?</h2>
          <p className="text-base opacity-90">
            Создайте своё первое событие за несколько минут и начните собирать экипажи
          </p>
          <div className="flex justify-center">
            <Button asChild className="h-12 rounded-lg bg-white px-6 text-base font-semibold text-[#E86223] hover:bg-white/90">
              <Link href="/events/create">Создать ивент бесплатно</Link>
            </Button>
          </div>
        </div>
      </section>
      <footer className="pt-6">
        <p className="text-xs text-muted-foreground">Need4Trip · бета-версия.</p>
      </footer>
    </div>
  );
}
