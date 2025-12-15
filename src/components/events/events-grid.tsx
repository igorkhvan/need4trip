"use client";

import { useMemo, useState, useEffect } from "react";
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
  Filter,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { Tabs } from "@/components/ui/tabs";
import { ProgressBar, calculateEventFillPercentage } from "@/components/ui/progress-bar";
import { CreateEventButton } from "@/components/events/create-event-button";
import { Event } from "@/lib/types/event";
import { EventCategoryDto } from "@/lib/types/eventCategory";
import { getCategoryLabel, getCategoryIcon } from "@/lib/utils/eventCategories";
import { formatDateTimeShort, formatDateShort, getDaysUntil } from "@/lib/utils/dates";

interface EventsGridProps {
  events: Event[];
  currentUserId: string | null;
  isAuthenticated: boolean;
}

type TabType = "all" | "upcoming" | "my";
type PriceFilter = "all" | "free" | "paid";
type SortBy = "date" | "participants" | "name";

export function EventsGrid({ events, currentUserId, isAuthenticated }: EventsGridProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterCity, setFilterCity] = useState<string>("all");
  const [filterPrice, setFilterPrice] = useState<PriceFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [categories, setCategories] = useState<EventCategoryDto[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Load categories from API
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/event-categories");
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories || []);
        }
      } catch (error) {
        console.error("Failed to load categories:", error);
      } finally {
        setLoadingCategories(false);
      }
    }
    loadCategories();
  }, []);

  // Get unique cities from events
  const uniqueCities = useMemo(() => {
    const cities = events
      .map((e) => e.city?.name)
      .filter((c): c is string => c !== null && c !== undefined && c.trim() !== "");
    return Array.from(new Set(cities)).sort();
  }, [events]);

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

  const filteredAndSorted = useMemo(() => {
    let result = [...filteredBySearch];

    // Filter by category
    if (filterCategory !== "all") {
      result = result.filter((e) => e.category?.id === filterCategory);
    }

    // Filter by city
    if (filterCity !== "all") {
      result = result.filter((e) => e.city?.name === filterCity);
    }

    // Filter by price
    if (filterPrice !== "all") {
      result = result.filter((e) => {
        if (filterPrice === "free") return !e.isPaid;
        if (filterPrice === "paid") return e.isPaid;
        return true;
      });
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
        case "participants":
          return (b.participantsCount ?? 0) - (a.participantsCount ?? 0);
        case "name":
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return result;
  }, [filteredBySearch, filterCategory, filterCity, filterPrice, sortBy]);

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

  // Pagination
  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEvents = filteredAndSorted.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when filters change
  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

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
        <CreateEventButton 
          isAuthenticated={isAuthenticated}
          className="h-12 rounded-xl px-6 text-base shadow-sm"
        />
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
      <Tabs
        tabs={[
          { id: "all", label: "Все события" },
          { id: "upcoming", label: "Предстоящие" },
          { id: "my", label: "Мои события", hidden: !currentUserId },
        ]}
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as TabType)}
      />

      {/* Search */}
      <div className="max-w-md">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6B7280]" />
          <Input
            type="text"
            placeholder="Поиск по названию, организатору или месту..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="h-12 rounded-xl border border-[#E5E7EB] hover:border-[#D1D5DB] focus:border-[var(--color-primary)] focus:outline-none transition-colors pl-12 text-[15px] placeholder:text-[#6B7280]"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl bg-[#F9FAFB] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#6B7280]" />
          <span className="text-[13px] font-medium text-[#6B7280]">Фильтры и сортировка</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {/* Category filter */}
          <div className="space-y-1">
            <label className="text-[13px] text-[#6B7280]">Тип события</label>
            <Select
              value={filterCategory}
              onValueChange={(value) => {
                setFilterCategory(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Все типы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.nameRu}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* City filter */}
          <div className="space-y-1">
            <label className="text-[13px] text-[#6B7280]">Город</label>
            <Select
              value={filterCity}
              onValueChange={(value) => {
                setFilterCity(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Все города" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все города</SelectItem>
                {uniqueCities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price filter */}
          <div className="space-y-1">
            <label className="text-[13px] text-[#6B7280]">Стоимость</label>
            <Select
              value={filterPrice}
              onValueChange={(value: PriceFilter) => {
                setFilterPrice(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Любая" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Любая</SelectItem>
                <SelectItem value="free">Бесплатно</SelectItem>
                <SelectItem value="paid">Платно</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort by */}
          <div className="space-y-1">
            <label className="text-[13px] text-[#6B7280]">Сортировка</label>
            <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="По дате" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">По дате</SelectItem>
                <SelectItem value="participants">По участникам</SelectItem>
                <SelectItem value="name">По названию</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Results count */}
      {filteredAndSorted.length > 0 && (
        <div className="text-[14px] text-[#6B7280]">
          Найдено событий: <span className="font-medium text-[#111827]">{filteredAndSorted.length}</span>
        </div>
      )}

      {/* Events Grid */}
      {paginatedEvents.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {paginatedEvents.map((event) => {
            const fillPercentage = calculateEventFillPercentage(
              event.participantsCount ?? 0,
              event.maxParticipants
            );
            const CategoryIcon = event.category ? getCategoryIcon(event.category) : Car;
            const categoryLabel = event.category ? getCategoryLabel(event.category) : "Событие";
            const priceLabel =
              event.isPaid && event.price
                ? `${event.price} ${event.currency?.symbol ?? event.currencyCode ?? ""}`.trim()
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
                        <span>{formatDateTimeShort(event.dateTime)}</span>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={filteredAndSorted.length}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(value) => {
                setItemsPerPage(value);
                setCurrentPage(1);
              }}
            />
          )}
        </>
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

