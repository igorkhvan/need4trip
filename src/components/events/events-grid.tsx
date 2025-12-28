"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { Tabs } from "@/components/ui/tabs";
import { EventCardDetailed } from "@/components/events/event-card-detailed";
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
    return "upcoming";
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
  // SSOT: Use city.id (UUID) instead of city.name for API compatibility
  const uniqueCities = useMemo(() => {
    const citiesMap = new Map<string, { id: string; name: string }>();
    events.forEach((e) => {
      if (e.city?.id && e.city?.name) {
        citiesMap.set(e.city.id, { id: e.city.id, name: e.city.name });
      }
    });
    return Array.from(citiesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [events]);

  return (
    <div className="space-y-8">
      {/* Tabs */}
      <Tabs
        tabs={[
          { id: "upcoming", label: "Предстоящие" },
          { id: "my", label: "Мои события", hidden: !currentUserId },
          { id: "all", label: "Все события" },
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
                  <SelectItem key={city.id} value={city.id}>
                    {city.name}
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