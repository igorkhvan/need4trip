import Link from "next/link";
import { Inter } from "next/font/google";

import { Calendar, Car, CheckCircle2, MapPin, Settings, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listEventsSafe } from "@/lib/services/events";
import { EventCategory } from "@/lib/types/event";
import { getCategoryLabel } from "@/lib/utils/eventCategories";
import { formatDate } from "@/lib/utils/dates";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

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
    description: "Задавайте требования к типам и маркам автомобилей для вашего события",
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

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#F7F7F8] to-white py-24 md:py-40">
      <div className="page-container">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="heading-hero mb-6">
            Организация автомобильных поездок и учёт экипажей в пару кликов
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-[#374151]">
            Need4Trip помогает клубам и организаторам поездок собирать экипажи, настраивать регистрацию
            и управлять колонной в удобном интерфейсе.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" asChild>
              <Link href="/events/create">Создать событие</Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/events">Посмотреть события</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section className="bg-white py-24 md:py-32">
      <div className="page-container">
        <div className="mb-16 text-center">
          <h2 className="heading-section mb-6">Как это работает</h2>
          <p className="text-lead mx-auto max-w-2xl">
            Три простых шага для организации вашей автомобильной поездки
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((item, index) => (
            <Card
              key={item.title}
              className="border-[#E5E7EB] shadow-sm"
            >
              <CardContent className="p-8">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF6F2C] to-[#E86223] text-2xl font-bold text-white shadow-lg">
                  {index + 1}
                </div>
                <h3 className="mb-4 text-xl font-semibold leading-tight text-[#111827]">{item.title}</h3>
                <p className="text-base text-[#6B7280]">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="bg-[#F7F7F8] py-24 md:py-32">
      <div className="page-container">
        <div className="mb-16 text-center">
          <h2 className="heading-section mb-6">Что умеет Need4Trip</h2>
          <p className="text-lead mx-auto max-w-2xl">
            Все необходимые инструменты для организации автомобильных мероприятий
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.title}
                className="border-[#E5E7EB] bg-white shadow-sm"
              >
                <CardContent className="p-8">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFF4EF]">
                    <Icon className="h-6 w-6 text-[#FF6F2C]" strokeWidth={2} />
                  </div>
                  <h4 className="mb-3 text-xl font-semibold leading-tight text-[#111827]">{item.title}</h4>
                  <p className="text-base text-[#6B7280]">{item.description}</p>
                </CardContent>
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
    <section className="bg-white py-24 md:py-32">
      <div className="page-container">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h2 className="heading-section mb-4">Ближайшие события</h2>
            <p className="text-lead">Присоединяйтесь к активным автомобильным сообществам</p>
          </div>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/events">Все события</Link>
          </Button>
        </div>

        {events.length === 0 ? (
          <div className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-12 text-center text-sm text-[#6B7280] shadow-sm">
            Пока нет ближайших событий.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {events.map((event) => (
              <Link href={`/events/${event.id}`} key={event.id}>
                <Card className="h-full cursor-pointer border-[#E5E7EB] bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
                  <CardContent className="p-8">
                    <div className="mb-4 flex items-start justify-between">
                      <h4 className="flex-1 text-xl font-semibold leading-tight text-[#111827]">
                        {event.title}
                      </h4>
                      <span className="ml-2 whitespace-nowrap rounded-full bg-[#F7F7F8] px-3 py-1 text-[13px] font-medium text-[#6B7280]">
                        {event.typeLabel ?? "Событие"}
                      </span>
                    </div>
                    <div className="space-y-3 text-[15px] text-[#6B7280]">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-[#9CA3AF]" />
                        <span>{formatDate(event.startsAt)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-[#9CA3AF]" />
                        <span>
                          {event.participantsCount ?? 0}
                          {event.maxParticipants ? ` / ${event.maxParticipants}` : ""} участников
                        </span>
                      </div>
                      {event.description && (
                        <div className="flex items-start gap-3">
                          <Car className="mt-1 h-5 w-5 flex-shrink-0 text-[#9CA3AF]" />
                          <span>
                            {event.description.slice(0, 80)}
                            {event.description.length > 80 ? "..." : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
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
    typeLabel: e.category ? getCategoryLabel(e.category as EventCategory) : "Событие",
    description: e.description ?? null,
    participantsCount: e.participantsCount ?? null,
    maxParticipants: e.maxParticipants ?? null,
  }));

  return (
    <div
      className={`${inter.className} relative left-1/2 right-1/2 w-screen -ml-[50vw] -mr-[50vw] min-h-screen bg-white text-[#111827]`}
    >
      <Hero />
      <HowItWorksSection />
      <Features />
      <UpcomingEventsSection events={events} />
      <section className="relative overflow-hidden bg-gradient-to-br from-[#FF6F2C] to-[#E86223] py-24 text-center text-white md:py-32">
        <div
          className="absolute inset-0 opacity-50"
          aria-hidden
          style={{
            backgroundImage:
              "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')",
          }}
        />
        <div className="relative page-container">
          <h2 className="heading-section mb-6 text-white">Готовы начать?</h2>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-white/90">
            Создайте своё первое событие за несколько минут и начните собирать экипажи
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/events/create">Создать событие бесплатно</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
