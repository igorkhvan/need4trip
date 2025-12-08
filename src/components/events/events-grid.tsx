"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Calendar,
  Users,
  TrendingUp,
  Car,
  Mountain,
  MapPin,
  Clock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProgressBar, calculateEventFillPercentage } from "@/components/ui/progress-bar";
import { Event, EventCategory } from "@/lib/types/event";
import { getCategoryLabel } from "@/lib/utils/eventCategories";

const CATEGORY_ICONS: Record<EventCategory, typeof Car> = {
  weekend_trip: Mountain,
  technical_ride: Car,
  meeting: Users,
  training: TrendingUp,
  service_day: Car,
  other: Car,
};

interface EventsGridProps {
  events: Event[];
  currentUserId: string | null;
}

type TabType = "all" | "upcoming" | "my";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDaysUntil(dateTime: string): number {
  const eventDate = new Date(dateTime);
  const now = new Date();
  const diff = eventDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function EventsGrid({ events, currentUserId }: EventsGridProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("all");

  const filteredByTab = useMemo(() => {
    if (activeTab === "upcoming") {
      const now = new Date();
      return events.filter((e) => new Date(e.dateTime) > now);
    }
    if (activeTab === "my" && currentUserId) {
      return events.filter((e) => e.createdByUserId === currentUserId);
    }
    return events;
  }, [events, activeTab, currentUserId]);

  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return filteredByTab;
    const query = searchQuery.toLowerCase();
    return filteredByTab.filter(
      (e) =>
        e.title.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query) ||
        e.locationText.toLowerCase().includes(query) ||
        e.ownerName?.toLowerCase().includes(query) ||
        e.ownerHandle?.toLowerCase().includes(query)
    );
  }, [filteredByTab, searchQuery]);

  const stats = useMemo(() => {
    const now = new Date();
    const activeRegistrations = events.filter((e) => new Date(e.dateTime) > now).length;
    const totalParticipants = events.reduce((sum, e) => sum + (e.participantsCount ?? 0), 0);
    return {
      totalEvents: events.length,
      activeRegistrations,
      totalParticipants,
    };
  }, [events]);

  const getStatusBadge = (event: Event) => {
    const daysUntil = getDaysUntil(event.dateTime);
    const fillPercentage = event.maxParticipants
      ? ((event.participantsCount ?? 0) / event.maxParticipants) * 100
      : 0;

    if (daysUntil <= 7 && daysUntil >= 0) {
      return (
        <Badge variant="starting-soon" size="md">
          Скоро начало
        </Badge>
      );
    }

    if (fillPercentage >= 90) {
      return (
        <Badge variant="almost-full" size="md">
          Почти заполнено
        </Badge>
      );
    }

    return (
      <Badge variant="registration-open" size="md">
        Открыта регистрация
      </Badge>
    );
  };

  // Удалено: используем компонент ProgressBar вместо кастомной логики

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold leading-tight text-[#111827] sm:text-5xl">
            Все события
          </h1>
          <p className="text-base text-[#6B7280]">
            Найдите подходящую автомобильную поездку или создайте свою
          </p>
        </div>
        <Button asChild className="h-12 rounded-xl px-6 text-base shadow-sm">
          <Link href="/events/create">Создать событие</Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-[#E5E7EB] shadow-sm">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <div className="mb-2 text-[14px] text-[#6B7280]">Всего событий</div>
              <div className="text-[36px] font-bold leading-none text-[#111827]">
                {stats.totalEvents}
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFF4EF]">
              <Calendar className="h-6 w-6 text-[#FF6F2C]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB] shadow-sm">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <div className="mb-2 text-[14px] text-[#6B7280]">Активных регистраций</div>
              <div className="text-[36px] font-bold leading-none text-[#111827]">
                {stats.activeRegistrations}
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F0FDF4]">
              <TrendingUp className="h-6 w-6 text-[#22C55E]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB] shadow-sm">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <div className="mb-2 text-[14px] text-[#6B7280]">Всего участников</div>
              <div className="text-[36px] font-bold leading-none text-[#111827]">
                {stats.totalParticipants}
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFF4EF]">
              <Users className="h-6 w-6 text-[#FF6F2C]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#E5E7EB]">
        <button
          onClick={() => setActiveTab("all")}
          className={`border-b-2 px-4 py-3 text-[15px] transition-colors ${
            activeTab === "all"
              ? "border-[#FF6F2C] text-[#FF6F2C]"
              : "border-transparent text-[#6B7280] hover:text-[#111827]"
          }`}
        >
          Все события
        </button>
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`border-b-2 px-4 py-3 text-[15px] transition-colors ${
            activeTab === "upcoming"
              ? "border-[#FF6F2C] text-[#FF6F2C]"
              : "border-transparent text-[#6B7280] hover:text-[#111827]"
          }`}
        >
          Предстоящие
        </button>
        {currentUserId && (
          <button
            onClick={() => setActiveTab("my")}
            className={`border-b-2 px-4 py-3 text-[15px] transition-colors ${
              activeTab === "my"
                ? "border-[#FF6F2C] text-[#FF6F2C]"
                : "border-transparent text-[#6B7280] hover:text-[#111827]"
            }`}
          >
            Мои события
          </button>
        )}
      </div>

      {/* Search */}
      <div className="max-w-md">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6B7280]" />
          <Input
            type="text"
            placeholder="Поиск по названию, организатору или месту..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 rounded-xl border-2 pl-12 text-[15px] placeholder:text-[#6B7280]"
          />
        </div>
      </div>

      {/* Events Grid */}
      {filteredBySearch.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {filteredBySearch.map((event) => {
            const fillPercentage = calculateEventFillPercentage(
              event.participantsCount ?? 0,
              event.maxParticipants
            );
            const CategoryIcon = event.category ? CATEGORY_ICONS[event.category] : Car;
            const categoryLabel = event.category ? getCategoryLabel(event.category) : "Событие";
            const priceLabel =
              event.isPaid && event.price
                ? `${event.price} ${event.currency ?? ""}`.trim()
                : event.isPaid
                  ? "Платное"
                  : "Бесплатно";

            return (
              <Card
                key={event.id}
                className="cursor-pointer border-[#E5E7EB] shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
                onClick={() => router.push(`/events/${event.id}`)}
              >
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="mb-2 text-2xl font-semibold leading-tight text-[#111827]">
                        {event.title}
                      </h3>
                      <div className="flex items-center gap-2 text-[14px] text-[#6B7280]">
                        <div className="flex items-center gap-1">
                          <CategoryIcon className="h-4 w-4" />
                          <span>{categoryLabel}</span>
                        </div>
                        <span>•</span>
                        <span>
                          {event.ownerHandle
                            ? `@${event.ownerHandle}`
                            : event.ownerName ?? "Организатор"}
                        </span>
                      </div>
                    </div>
                    {getStatusBadge(event)}
                  </div>

                  {/* Info Grid */}
                  <div className="mb-4 grid grid-cols-2 gap-4 rounded-xl bg-[#F7F7F8] p-4">
                    <div>
                      <div className="mb-1 text-[13px] text-[#6B7280]">Дата и время</div>
                      <div className="flex items-center gap-1 text-[15px] text-[#111827]">
                        <Clock className="h-4 w-4 text-[#6B7280]" />
                        <span>{formatDateTime(event.dateTime)}</span>
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 text-[13px] text-[#6B7280]">Место сбора</div>
                      <div className="flex items-center gap-1 text-[15px] text-[#111827]">
                        <MapPin className="h-4 w-4 text-[#6B7280]" />
                        <span className="truncate">{event.locationText}</span>
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 text-[13px] text-[#6B7280]">Участники</div>
                      <div className="text-[15px] text-[#111827]">
                        {event.participantsCount ?? 0}
                        {event.maxParticipants ? ` / ${event.maxParticipants}` : ""}
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 text-[13px] text-[#6B7280]">Стоимость</div>
                      <div className="text-[15px] text-[#111827]">{priceLabel}</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {event.maxParticipants && (
                    <ProgressBar value={fillPercentage} />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        // Empty State
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F7F7F8]">
            <Search className="h-8 w-8 text-[#6B7280]" />
          </div>
          <h3 className="mb-2 text-2xl font-semibold text-[#111827]">Ничего не найдено</h3>
          <p className="mb-6 text-base text-[#6B7280]">
            Попробуйте изменить поисковый запрос или фильтр
          </p>
          <Button variant="ghost" onClick={() => setSearchQuery("")}>
            Сбросить поиск
          </Button>
        </div>
      )}
    </div>
  );
}

