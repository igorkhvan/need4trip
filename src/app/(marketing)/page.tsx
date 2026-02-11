import { Suspense } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { buildStaticPageMetadata } from "@/lib/seo/metadataBuilder";

/**
 * Per SSOT_SEO.md §13.1: Homepage title pattern: "{Brand} — {Value Proposition}"
 * Homepage overrides the root layout template with a custom full title.
 */
export const metadata: Metadata = buildStaticPageMetadata({
  title: "Need4Trip — Автомобильные события и клубы Казахстана",
  description:
    "Создавайте оффроуд-поездки, собирайте экипажи и управляйте участниками. Простая регистрация по ссылке.",
  canonicalPath: "/",
  ogImageAlt: "Need4Trip — Автомобильные события и клубы Казахстана",
});

import { Calendar, Car, CheckCircle2, MapPin, Settings, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Hero } from "@/components/landing/hero";
import { CreateEventButton } from "@/components/events/create-event-button";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { UpcomingEventsAsync } from "./_components/upcoming-events-async";
import { UpcomingEventsSkeleton } from "./_components/upcoming-events-skeleton";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Event types moved to async component

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

function HowItWorksSection() {
  return (
    <section className="bg-white py-12 md:py-20 lg:py-24">
      <div className="page-container">
        <div className="mb-12 text-center md:mb-16">
          <h2 className="heading-section mb-4 md:mb-6">Как это работает</h2>
          <p className="text-lead mx-auto max-w-2xl">
            Три простых шага для организации вашей автомобильной поездки
          </p>
        </div>
        <div className="grid gap-6 md:gap-8 md:grid-cols-3">
          {steps.map((item, index) => (
            <Card
              key={item.title}
              className="border-[#E5E7EB] shadow-sm"
            >
              <CardContent className="p-6 md:p-8">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF6F2C] to-[#E86223] text-2xl font-bold text-white shadow-lg md:mb-6 md:h-16 md:w-16">
                  {index + 1}
                </div>
                <h3 className="mb-3 text-lg font-semibold leading-tight text-[#111827] md:mb-4 md:text-xl">{item.title}</h3>
                <p className="text-sm text-muted-foreground md:text-base">{item.description}</p>
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
    <section className="bg-[#F7F7F8] py-12 md:py-20 lg:py-24">
      <div className="page-container">
        <div className="mb-12 text-center md:mb-16">
          <h2 className="heading-section mb-4 md:mb-6">Что умеет Need4Trip</h2>
          <p className="text-lead mx-auto max-w-2xl">
            Все необходимые инструменты для организации автомобильных мероприятий
          </p>
        </div>
        <div className="grid gap-5 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.title}
                className="border-[#E5E7EB] bg-white shadow-sm"
              >
                <CardContent className="p-6 md:p-8">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFF4EF] md:mb-5">
                    <Icon className="h-6 w-6 text-[#FF6F2C]" strokeWidth={2} />
                  </div>
                  <h4 className="mb-2 text-lg font-semibold leading-tight text-[#111827] md:mb-3 md:text-xl">{item.title}</h4>
                  <p className="text-sm text-muted-foreground md:text-base">{item.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// UpcomingEventsSection moved to async component for streaming SSR

export default async function HomePage() {
  // Загружаем только критичные данные сразу
  const currentUser = await getCurrentUser();
  const isAuthenticated = !!currentUser;

  return (
    <>
      {/* Критичный контент - показываем сразу */}
      <Hero isAuthenticated={isAuthenticated} />
      <HowItWorksSection />
      <Features />
      
      {/* Async контент - загружаем параллельно с Suspense */}
      <Suspense fallback={<UpcomingEventsSkeleton />}>
        <UpcomingEventsAsync />
      </Suspense>
      
      {/* CTA секция */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#FF6F2C] to-[#E86223] py-12 text-center text-white md:py-20 lg:py-24">
        <div
          className="absolute inset-0 opacity-50"
          aria-hidden
          style={{
            backgroundImage:
              "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')",
          }}
        />
        <div className="relative page-container">
          <h2 className="heading-section mb-4 text-white md:mb-6">Готовы начать?</h2>
          <p className="mx-auto mb-8 max-w-2xl text-base text-white/90 md:mb-10 md:text-lg">
            Создайте своё первое событие за несколько минут и начните собирать экипажи
          </p>
          <CreateEventButton 
            isAuthenticated={isAuthenticated}
            size="lg" 
            variant="secondary"
          >
            Создать событие бесплатно
          </CreateEventButton>
        </div>
      </section>
    </>
  );
}
