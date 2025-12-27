"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Calendar, Users, TrendingUp, Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { Tabs } from "@/components/ui/tabs";
import { EventCardDetailed } from "@/components/events/event-card-detailed";
import { CreateEventButton } from "@/components/events/create-event-button";
import { useLoadingTransition } from "@/hooks/use-loading-transition";
import { DelayedSpinner } from "@/components/ui/delayed-spinner";
import { EventCategoryDto } from "@/lib/types/eventCategory";
import { EventListItemHydrated } from "@/lib/services/events";

interface EventsGridProps {
  events: EventListItemHydrated[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  } | null;
  stats: {
    total: number;
  } | null;
  currentUserId: string | null;
  isAuthenticated: boolean;
  onTabChange: (tab: string) => void;
  onPageChange: (page: number) => void;
  onSearchChange: (search: string) => void;
  onSortChange: (sort: string) => void;
  onCityChange: (cityId: string) => void;
  onCategoryChange: (categoryId: string) => void;
}

type TabType = "all" | "upcoming" | "my";
type SortBy = "date" | "name";

export function EventsGrid({ 
  events, 
  meta, 
  stats,
  currentUserId, 
  isAuthenticated,
  onTabChange,
  onPageChange,
  onSearchChange,
  onSortChange,
  onCityChange,
  onCategoryChange,
}: EventsGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterCity, setFilterCity] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [categories, setCategories] = useState<EventCategoryDto[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  
  // Read activeTab from URL
  const activeTab = useMemo((): TabType => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "upcoming" || tabParam === "my" || tabParam === "all") {
      return tabParam;
    }
    return "all";
  }, [searchParams]);
  
  // Use loading transition for smooth filter changes
  const { isPending, showLoading, startTransition } = useLoadingTransition(300);

  // Load categories from API
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/event-categories");
        if (res.ok) {
          const response = await res.json();
          const data = response.data || response;
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

  // Get unique cities from events (client-side for filter dropdown)
  const uniqueCities = useMemo(() => {
    const cities = events
      .map((e) => e.city?.name)
      .filter((c): c is string => c !== null && c !== undefined && c.trim() !== "");
    return Array.from(new Set(cities)).sort();
  }, [events]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h1 className="heading-hero">
            Все события
          </h1>
          <p className="text-base text-muted-foreground">
            Найдите подходящую автомобильную поездку или создайте свою
          </p>
        </div>
        <CreateEventButton 
          isAuthenticated={isAuthenticated}
          className="h-12 rounded-xl px-6 text-base shadow-sm"
        />
      </div>

      {/* Stats Cards */}
      <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide sm:mx-0 sm:px-0">
        <div className="flex gap-4 md:grid md:grid-cols-3 min-w-max md:min-w-0">
          <Card className="border-[var(--color-border)] shadow-sm min-w-[240px] md:min-w-0">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <div className="mb-2 text-sm text-muted-foreground">Всего событий</div>
                <div className="text-4xl font-bold leading-none text-[var(--color-text)]">
                  {stats?.total ?? 0}
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary-bg)]">
                <Calendar className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-[var(--color-border)] shadow-sm min-w-[240px] md:min-w-0">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <div className="mb-2 text-sm text-muted-foreground">Активных регистраций</div>
                <div className="text-4xl font-bold leading-none text-[var(--color-text)]">
                  {meta?.total ?? 0}
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-success-bg)]">
                <TrendingUp className="h-6 w-6 text-[var(--color-success)]" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-[var(--color-border)] shadow-sm min-w-[240px] md:min-w-0">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <div className="mb-2 text-sm text-muted-foreground">Всего участников</div>
                <div className="text-4xl font-bold leading-none text-[var(--color-text)]">
                  {events.reduce((sum, e) => sum + (e.participantsCount ?? 0), 0)}
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary-bg)]">
                <Users className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: "all", label: "Все события" },
          { id: "upcoming", label: "Предстоящие" },
          { id: "my", label: "Мои события", hidden: !currentUserId },
        ]}
        activeTab={activeTab}
        onChange={(tabId) => {
          startTransition(() => {
            onTabChange(tabId);
          });
        }}
      />

      {/* Search */}
      <div className="max-w-md">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Поиск по названию..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                startTransition(() => {
                  onSearchChange(searchQuery.trim());
                });
              }
            }}
            onBlur={() => {
              // Apply search on blur
              startTransition(() => {
                onSearchChange(searchQuery.trim());
              });
            }}
            className="pl-12"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl bg-[var(--color-bg-subtle)] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Фильтры и сортировка</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {/* Category filter */}
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Тип события</label>
            <Select
              value={filterCategory}
              onValueChange={(value) => {
                startTransition(() => {
                  setFilterCategory(value);
                  onCategoryChange(value);
                });
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
            <label className="text-sm text-muted-foreground">Город</label>
            <Select
              value={filterCity}
              onValueChange={(value) => {
                startTransition(() => {
                  setFilterCity(value);
                  onCityChange(value);
                });
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

          {/* Sort by */}
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Сортировка</label>
            <Select value={sortBy} onValueChange={(value: SortBy) => {
              startTransition(() => {
                setSortBy(value);
                onSortChange(value);
              });
            }}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="По дате" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">По дате</SelectItem>
                <SelectItem value="name">По названию</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Results count */}
      {meta && meta.total > 0 && (
        <div className="text-sm text-muted-foreground">
          Найдено событий: <span className="font-medium text-[var(--color-text)]">{meta.total}</span>
          {meta.totalPages > 1 && ` (страница ${meta.page} из ${meta.totalPages})`}
        </div>
      )}

      {/* Delayed loading spinner */}
      <DelayedSpinner show={showLoading} className="mb-4" />
      
      {/* Events Grid */}
      {events.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {events.map((event) => (
              <EventCardDetailed
                key={event.id}
                event={event as any}
                onClick={() => router.push(`/events/${event.id}`)}
              />
            ))}
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <Pagination
              currentPage={meta.page}
              totalPages={meta.totalPages}
              onPageChange={(page) => {
                startTransition(() => {
                  onPageChange(page);
                });
              }}
            />
          )}
        </>
      ) : (
        // Empty State
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-bg-subtle)]">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="heading-h2 mb-2">Ничего не найдено</h3>
          <p className="mb-6 text-base text-muted-foreground">
            Попробуйте изменить поисковый запрос или фильтр
          </p>
          <Button variant="ghost" onClick={() => {
            setSearchQuery("");
            onSearchChange("");
          }}>
            Сбросить поиск
          </Button>
        </div>
      )}
    </div>
  );
}