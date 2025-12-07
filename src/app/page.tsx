import Link from "next/link";

import { Calendar, Car, CheckCircle2, MapPin, Settings, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listEventsSafe } from "@/lib/services/events";

type EventSummary = {
  id: string;
  title: string;
  startsAt: string;
  typeLabel?: string | null;
  description?: string | null;
  participantsCount?: number | null;
  maxParticipants?: number | null;
};

const features = [
  {
    title: "Создание событий",
    description: "Создавайте автомобильные поездки с настройками регистрации за минуты",
    icon: Calendar,
  },
  {
    title: "Учёт экипажей",
    description: "Собирайте данные участников через удобные формы с кастомными полями",
    icon: Users,
  },
  {
    title: "Требования к авто",
    description: "Задавайте требования к типам и маркам автомобилей для вашего ивента",
    icon: Car,
  },
  {
    title: "Управление колонной",
    description: "Организуйте участников в колонну и контролируйте маршрут",
    icon: MapPin,
  },
  {
    title: "Гибкие настройки",
    description: "Настраивайте правила участия, роли и дополнительные параметры",
    icon: Settings,
  },
  {
    title: "Простая регистрация",
    description: "Участники регистрируются по ссылке без лишних шагов",
    icon: CheckCircle2,
  },
];

const steps = [
  {
    title: "Создайте событие",
    description: "Укажите детали поездки, требования к автомобилям и настройте форму регистрации",
  },
  {
    title: "Поделитесь ссылкой",
    description: "Отправьте ссылку участникам в Telegram или другие мессенджеры",
  },
  {
    title: "Управляйте экипажами",
    description: "Следите за регистрациями, формируйте колонну и управляйте участниками",
  },
];

function formatEventMeta(event: EventSummary): string {
  const d = new Date(event.startsAt);
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function Hero() {
  return (
    <section className="bg-gradient-to-b from-[#F7F9FC] to-white py-20 md:py-28">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-10 px-5 text-center md:px-8">
        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight text-[#0F172A] sm:text-5xl">
            Организация автомобильных поездок и учёт экипажей в пару кликов
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-[#6B7280]">
            Need4Trip помогает клубам и организаторам поездок собирать экипажи, настраивать регистрацию
            и управлять колонной в удобном интерфейсе.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" asChild>
              <Link href="/events/create">Создать ивент</Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/events">Посмотреть ивенты</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl space-y-12 px-5 text-center md:px-8">
        <div className="space-y-4">
          <h2 className="text-3xl font-semibold leading-tight text-[#0F172A]">Как это работает</h2>
          <p className="text-lg text-[#6B7280]">Три простых шага для организации вашей автомобильной поездки</p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((item, index) => (
            <Card key={item.title} className="h-full border border-[#E5E7EB] shadow-sm">
              <CardHeader className="space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF6F2C] to-[#ff874c] text-2xl font-bold text-white shadow-lg">
                  {index + 1}
                </div>
                <CardTitle className="text-lg font-semibold text-[#0F172A]">{item.title}</CardTitle>
                <CardDescription className="text-base text-[#6B7280]">{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="bg-[#F7F9FC] py-16 md:py-24">
      <div className="mx-auto max-w-6xl space-y-12 px-5 md:px-8">
        <div className="space-y-4 text-center">
          <h2 className="text-3xl font-semibold leading-tight text-[#0F172A]">Что умеет Need4Trip</h2>
          <p className="mx-auto max-w-2xl text-lg text-[#6B7280]">
            Все необходимые инструменты для организации автомобильных мероприятий
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="h-full border border-[#E5E7EB] shadow-sm">
                <CardHeader className="space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFF4EF]">
                    <Icon className="h-6 w-6 text-[#FF6F2C]" />
                  </div>
                  <CardTitle className="text-lg font-semibold text-[#0F172A]">{item.title}</CardTitle>
                  <CardDescription className="text-base text-[#6B7280]">{item.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function UpcomingEventsSection({ events }: { events: EventSummary[] }) {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl space-y-12 px-5 md:px-8">
        <div className="space-y-3 text-center">
          <h2 className="text-3xl font-semibold leading-tight text-[#0F172A]">Ближайшие ивенты</h2>
          <p className="text-lg text-[#6B7280]">Присоединяйтесь к активным автомобильным сообществам</p>
        </div>

        <div className="flex justify-center">
          <Button size="lg" variant="secondary" asChild>
            <Link href="/events">Все события</Link>
          </Button>
        </div>

        {events.length === 0 ? (
          <div className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-12 text-center text-sm text-[#6B7280] shadow-sm">
            Пока нет ближайших ивентов.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Card
                key={event.id}
                className="flex h-full flex-col border border-[#E5E7EB] bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
              >
                <CardContent className="flex h-full flex-col gap-5 p-5">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-lg font-semibold text-[#0F172A]">{event.title}</CardTitle>
                      <span className="whitespace-nowrap rounded-full bg-[#F0F2F5] px-3 py-1 text-[12px] font-medium text-[#6B7280]">
                        {event.typeLabel ?? "Ивент"}
                      </span>
                    </div>
                    <div className="space-y-2 text-[15px] text-[#6B7280]">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-[#9CA3AF]" />
                        <span>{formatEventMeta(event)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-[#9CA3AF]" />
                        <span>
                          {event.participantsCount ?? 0}
                          {event.maxParticipants ? ` / ${event.maxParticipants}` : ""} участников
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-[#6B7280]">
                      {event.description ? event.description.slice(0, 90) : "Детали маршрута и требования внутри карточки события."}
                    </p>
                  </div>
                  <div className="mt-auto flex justify-end">
                    <Button variant="secondary" size="sm" asChild>
                      <Link href={`/events/${event.id}`}>Подробнее</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
    participantsCount: e.participantsCount ?? null,
    maxParticipants: e.maxParticipants ?? null,
  }));

  return (
    <div className="space-y-0 bg-[#F7F9FC]">
      <Hero />
      <HowItWorksSection />
      <Features />
      <UpcomingEventsSection events={events} />
      <section className="relative overflow-hidden bg-gradient-to-br from-[#FF6F2C] to-[#ff874c] py-20 text-center text-white">
        <div
          className="absolute inset-0 opacity-30"
          aria-hidden
          style={{
            backgroundImage:
              "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')",
          }}
        />
        <div className="relative mx-auto max-w-6xl space-y-6 px-5 md:px-8">
          <h2 className="text-3xl font-semibold leading-tight">Готовы начать?</h2>
          <p className="text-lg text-white/90">
            Создайте своё первое событие за несколько минут и начните собирать экипажи
          </p>
          <div className="flex justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/events/create">Создать ивент бесплатно</Link>
            </Button>
          </div>
        </div>
      </section>
      <footer className="bg-white px-5 py-6 text-center text-xs text-muted-foreground md:px-8">
        Need4Trip · бета-версия.
      </footer>
    </div>
  );
}
