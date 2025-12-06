import type { ElementType } from "react";
import Link from "next/link";

import { Calendar, Car, CheckCircle2, MapPin, Settings, Users } from "lucide-react";

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

const features: { title: string; description: string; icon: ElementType; accent: string }[] = [
  {
    title: "Создание поездок и встреч",
    description: "Планируйте любые автопоездки: выходные, встречи клуба, сервис-дни.",
    icon: Calendar,
    accent: "bg-[#FFF4EF] text-[#E86223]",
  },
  {
    title: "Регистрация экипажей по вашим правилам",
    description: "Настраивайте поля: контакты, опыт, авто, количество людей.",
    icon: Users,
    accent: "bg-[#F0FDF4] text-[#16A34A]",
  },
  {
    title: "Лимиты и контроль участников",
    description: "Задавайте max экипажей или оставляйте набор открытым.",
    icon: CheckCircle2,
    accent: "bg-[#FFFBEB] text-[#D97706]",
  },
  {
    title: "Роли в колонне",
    description: "Назначайте лидера, замыкающего и управляйте порядком движения.",
    icon: Car,
    accent: "bg-[#FFF4EF] text-[#E86223]",
  },
  {
    title: "Гибкие кастомные поля",
    description: "Собирайте только нужные данные от участников в удобной форме.",
    icon: Settings,
    accent: "bg-[#F0FDF4] text-[#16A34A]",
  },
  {
    title: "Прозрачное управление",
    description: "Следите за составом колонны и обновляйте данные в пару кликов.",
    icon: MapPin,
    accent: "bg-[#FFFBEB] text-[#D97706]",
  },
];

function Hero() {
  return (
    <section className="relative overflow-hidden rounded-[24px] border border-[#F3F4F6] bg-gradient-to-br from-[#FFF4EF] via-white to-white shadow-lg">
      <div className="absolute -left-10 top-[-40px] h-40 w-40 rounded-full bg-[#FFF4EF] blur-3xl" aria-hidden />
      <div className="grid gap-10 px-6 py-16 md:px-12 md:py-20 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
        <div className="space-y-6">
          <span className="inline-flex w-fit items-center rounded-full bg-[#FFF4EF] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#E86223]">
            Для клубов и организаторов автопоездок
          </span>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold leading-tight text-[#111827] sm:text-5xl">
              Организуйте автопоездки и экипажи в пару кликов
            </h1>
            <p className="max-w-2xl text-lg text-[#374151]">
              Need4Trip помогает собирать экипажи, настраивать регистрацию, контролировать роли и требования к авто — без сложных форм и лишних шагов.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Button asChild className="h-12 rounded-xl px-6 text-base shadow-sm">
              <Link href="/events/create">Создать ивент</Link>
            </Button>
            <Button
              variant="outline"
              asChild
              className="h-12 rounded-xl px-6 text-base border-2 hover:border-muted-foreground"
            >
              <Link href="/events">Посмотреть события</Link>
            </Button>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-[#6B7280]">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F7F8] px-4 py-2">
              <Users className="h-4 w-4 text-[#E86223]" />
              2 минуты на регистрацию
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F7F8] px-4 py-2">
              <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
              Безопасный вход через Telegram
            </div>
          </div>
        </div>

        <Card className="relative border border-[#E5E7EB] shadow-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl font-semibold text-[#111827]">
              Пример ивента «Зимний заезд в горы»
            </CardTitle>
            <CardDescription className="text-sm text-[#374151]">
              Иллюстрация того, как выглядит карточка события и требования к участникам.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 rounded-xl bg-[#F7F7F8] p-4 sm:grid-cols-2">
              <div>
                <p className="text-[13px] text-[#6B7280]">Дата и время</p>
                <p className="mt-1 flex items-center gap-2 text-[15px] text-[#111827]">
                  <Calendar className="h-4 w-4 text-[#6B7280]" /> 15 дек, 09:00
                </p>
              </div>
              <div>
                <p className="text-[13px] text-[#6B7280]">Место</p>
                <p className="mt-1 flex items-center gap-2 text-[15px] text-[#111827]">
                  <MapPin className="h-4 w-4 text-[#6B7280]" /> Алматинская обл.
                </p>
              </div>
              <div>
                <p className="text-[13px] text-[#6B7280]">Участники</p>
                <p className="mt-1 text-[15px] text-[#111827]">12 / 20 экипажей</p>
              </div>
              <div>
                <p className="text-[13px] text-[#6B7280]">Требования к авто</p>
                <p className="mt-1 flex items-center gap-2 text-[15px] text-[#111827]">
                  <Car className="h-4 w-4 text-[#6B7280]" /> Внедорожник 4x4
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[#F0FDF4] px-3 py-1 text-[13px] font-medium text-[#16A34A]">
                Открыта регистрация
              </span>
              <span className="rounded-full bg-[#FFFBEB] px-3 py-1 text-[13px] font-medium text-[#D97706]">
                Скоро начало
              </span>
            </div>
            <p className="text-sm text-[#374151]">
              Настройте правила, ограничения и кастомные поля — участники увидят их прямо в карточке события.
            </p>
          </CardContent>
        </Card>
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
    <section className="space-y-10 rounded-2xl bg-[#F7F7F8] px-6 py-12 md:px-10 md:py-16">
      <div className="space-y-3 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-[#111827]">Как это работает</h2>
        <p className="text-base text-[#6B7280]">
          Три простых шага для организации вашей автомобильной поездки
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {items.map((item, index) => (
          <Card key={item.title} className="h-full border border-[#E5E7EB] shadow-sm">
            <CardHeader className="space-y-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#FFF4EF] text-base font-semibold text-[#E86223]">
                {index + 1}
              </div>
              <CardTitle className="text-lg font-semibold text-[#111827]">{item.title}</CardTitle>
              <CardDescription className="text-sm text-[#374151]">{item.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="space-y-10">
      <div className="space-y-3 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-[#111827]">Что умеет Need4Trip</h2>
        <p className="mx-auto max-w-2xl text-base text-[#6B7280]">
          Сервис для организации поездок, учёта экипажей и управления событиями клуба.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="h-full border border-[#E5E7EB] shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
              <CardHeader className="space-y-4">
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${item.accent}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg font-semibold text-[#111827]">{item.title}</CardTitle>
                <CardDescription className="text-sm text-[#374151]">{item.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function UpcomingEventsSection({ events }: { events: EventSummary[] }) {
  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight text-[#111827]">Ближайшие ивенты</h2>
          <p className="text-base text-[#6B7280]">
            Несколько ближайших поездок. Полный список — на отдельной странице.
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild className="text-[#6B7280] hover:bg-[#F7F7F8]">
          <Link href="/events">Все ивенты →</Link>
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-10 text-center text-sm text-[#6B7280]">
          Пока нет ближайших ивентов.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Card
              key={event.id}
              className="flex h-full flex-col border border-[#E5E7EB] shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
            >
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-semibold text-[#111827]">{event.title}</CardTitle>
                    <CardDescription className="text-sm text-[#6B7280]">
                      {event.typeLabel ?? "Ивент"} • {formatEventMeta(event)}
                    </CardDescription>
                  </div>
                  <span className="rounded-full bg-[#FFF4EF] px-3 py-1 text-[13px] font-medium text-[#E86223]">
                    Ближайший
                  </span>
                </div>
              </CardHeader>
              {event.description && (
                <CardContent className="space-y-4">
                  <p className="line-clamp-3 text-sm text-[#374151]">{event.description}</p>
                </CardContent>
              )}
              <CardFooter className="mt-auto flex items-center justify-between gap-2 border-t border-[#F3F4F6] pt-4">
                <div className="text-sm text-[#6B7280]">Подробнее о маршруте и требованиях</div>
                <Button variant="outline" size="sm" asChild className="rounded-xl">
                  <Link href={`/events/${event.id}`}>Открыть</Link>
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
    <div className="mx-auto max-w-7xl space-y-20 px-5 py-12 md:px-10 lg:px-12">
      <Hero />
      <HowItWorksSection />
      <Features />
      <UpcomingEventsSection events={events} />
      <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#FF6F2C] to-[#ff874c] px-6 py-16 text-center text-white shadow-xl md:px-12">
        <div className="space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight">Готовы начать?</h2>
          <p className="text-lg opacity-90">
            Создайте своё первое событие за несколько минут и начните собирать экипажи
          </p>
          <div className="flex justify-center">
            <Button
              asChild
              className="h-12 rounded-xl bg-white px-6 text-base font-semibold text-[#E86223] shadow-sm hover:bg-white/90"
            >
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
