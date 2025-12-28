/**
 * EventsPageClient Component
 * 
 * Client-driven shell для Events страницы.
 * - Управляет URL params (SSOT)
 * - Независимые data fetches (stats + list)
 * - Skeleton loading для stats и list
 * - Non-refreshing navigation (router.push/replace без reload)
 */

"use client";

import { useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, Users, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { EventsGrid } from "@/components/events/events-grid";
import { StatsSkeleton } from "@/components/events/stats-skeleton";
import { EventCardSkeletonGrid } from "@/components/ui/skeletons/event-card-skeleton";
import { CreateEventButton } from "@/components/events/create-event-button";
import { LoadingBar } from "@/components/ui/loading-bar";
import { useAuth } from "@/components/auth/auth-provider";
import { useAuthModalContext } from "@/components/auth/auth-modal-provider";
import { useEventsQuery } from "@/hooks/use-events-query";
import { useEventsStats } from "@/hooks/use-events-stats";

export function EventsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser, isAuthenticated } = useAuth();
  const { openModal: openAuthModal } = useAuthModalContext();

  // Build params WITHOUT "page" for stats query
  const statsParams = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    return params as unknown as ReturnType<typeof useSearchParams>;
  }, [searchParams]);

  // Data fetching (independent)
  const { events, meta, loading: listLoading, refetching: listRefetching, error: listError } = useEventsQuery(searchParams);
  const { stats, loading: statsLoading, refetching: statsRefetching, error: statsError } = useEventsStats(statsParams);

  // Handle 401 on "my" tab
  const currentTab = searchParams.get("tab") || "all";
  if (listError && currentTab === "my" && !isAuthenticated) {
    openAuthModal();
  }

  /**
   * Helper: Update URL params
   * @param name - param name
   * @param value - param value (или null для удаления)
   * @param options.resetPage - сбросить page=1 (default: false)
   * @param options.method - 'push' или 'replace' (default: 'replace')
   * @param options.scroll - скроллить наверх (default: false)
   */
  const setParam = useCallback(
    (
      name: string,
      value: string | null,
      options?: { resetPage?: boolean; method?: "push" | "replace"; scroll?: boolean }
    ) => {
      const { resetPage = false, method = "replace", scroll = false } = options || {};

      const params = new URLSearchParams(searchParams.toString());

      // Update/delete param
      if (value === null || value === "" || value === "all") {
        params.delete(name);
      } else {
        params.set(name, value);
      }

      // Reset page if needed
      if (resetPage) {
        params.delete("page");
      }

      // Navigate
      const url = `/events?${params.toString()}`;
      if (method === "push") {
        router.push(url, { scroll });
      } else {
        router.replace(url, { scroll });
      }
    },
    [router, searchParams]
  );

  // Callbacks for EventsGrid
  const handleTabChange = useCallback(
    (tab: string) => {
      setParam("tab", tab, { resetPage: true, method: "replace" });
    },
    [setParam]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      setParam("page", page.toString(), { method: "push", scroll: false });
    },
    [setParam]
  );

  const handleSearchChange = useCallback(
    (search: string) => {
      setParam("search", search || null, { resetPage: true, method: "replace" });
    },
    [setParam]
  );

  const handleSortChange = useCallback(
    (sort: string) => {
      setParam("sort", sort, { method: "replace", scroll: false });
    },
    [setParam]
  );

  const handleCityChange = useCallback(
    (cityId: string) => {
      setParam("cityId", cityId, { resetPage: true, method: "replace" });
    },
    [setParam]
  );

  const handleCategoryChange = useCallback(
    (categoryId: string) => {
      setParam("categoryId", categoryId, { resetPage: true, method: "replace" });
    },
    [setParam]
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h1 className="heading-hero">Все события</h1>
          <p className="text-base text-muted-foreground">
            Найдите подходящую автомобильную поездку или создайте свою
          </p>
        </div>
        <CreateEventButton
          isAuthenticated={isAuthenticated}
          className="h-12 rounded-xl px-6 text-base shadow-sm"
        />
      </div>

      {/* Stats Section */}
      {statsLoading ? (
        <StatsSkeleton />
      ) : statsError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          Не удалось загрузить статистику
        </div>
      ) : (
        <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide sm:mx-0 sm:px-0">
          <div className="flex gap-4 md:grid md:grid-cols-3 min-w-max md:min-w-0">
            {/* Card 1: Всего событий */}
            <Card className="border-[var(--color-border)] shadow-sm min-w-[240px] md:min-w-0 relative">
              {statsRefetching && <LoadingBar />}
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

            {/* Card 2: Активных регистраций */}
            <Card className="border-[var(--color-border)] shadow-sm min-w-[240px] md:min-w-0 relative">
              {statsRefetching && <LoadingBar />}
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

            {/* Card 3: Всего участников */}
            <Card className="border-[var(--color-border)] shadow-sm min-w-[240px] md:min-w-0 relative">
              {statsRefetching && <LoadingBar />}
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
      )}

      {/* Events List Section */}
      <div className="relative">
        {listRefetching && events.length > 0 && <LoadingBar position="top" height={3} />}
        
        {listLoading ? (
          <EventCardSkeletonGrid count={6} />
        ) : listError ? (
          <div className="py-16 text-center">
            <p className="text-red-500">{listError}</p>
          </div>
        ) : (
          <EventsGrid
            events={events}
            meta={meta}
            currentUserId={currentUser?.id || null}
            isAuthenticated={isAuthenticated}
            onTabChange={handleTabChange}
            onPageChange={handlePageChange}
            onSearchChange={handleSearchChange}
            onSortChange={handleSortChange}
            onCityChange={handleCityChange}
            onCategoryChange={handleCategoryChange}
          />
        )}
      </div>
    </div>
  );
}

