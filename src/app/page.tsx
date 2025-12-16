import { Suspense } from "react";
import { Inter } from "next/font/google";

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

// UpcomingEventsSection moved to async component for streaming SSR

export default async function HomePage() {
  // Загружаем только критичные данные сразу
  const currentUser = await getCurrentUser();
  const isAuthenticated = !!currentUser;

  return (
    <div
      className={`${inter.className} relative left-1/2 right-1/2 w-screen -ml-[50vw] -mr-[50vw] min-h-screen bg-white text-[#111827]`}
    >
      {/* Критичный контент - показываем сразу */}
      <Hero isAuthenticated={isAuthenticated} />
      <HowItWorksSection />
      <Features />
      
      {/* Async контент - загружаем параллельно с Suspense */}
      <Suspense fallback={<UpcomingEventsSkeleton />}>
        <UpcomingEventsAsync />
      </Suspense>
      
      {/* CTA секция */}
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
          <CreateEventButton 
            isAuthenticated={isAuthenticated}
            size="lg" 
            variant="secondary"
          >
            Создать событие бесплатно
          </CreateEventButton>
        </div>
      </section>
    </div>
  );
}
