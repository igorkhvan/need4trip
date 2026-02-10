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

// SSOT_UI_STRUCTURE — static page chrome must render immediately
// SSOT_UI_ASYNC_PATTERNS — skeletons allowed only for dynamic sections
import { EventsGrid } from "@/components/events/events-grid";
import { CreateEventButton } from "@/components/events/create-event-button";
import { LoadingBar } from "@/components/ui/loading-bar";
import { useAuth } from "@/components/auth/auth-provider";
import { useAuthModalContext } from "@/components/auth/auth-modal-provider";
import { useEventsQuery, type EventsInitialData } from "@/hooks/use-events-query";

interface EventsPageClientProps {
  initialData?: EventsInitialData;
}

export function EventsPageClient({ initialData }: EventsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser, isAuthenticated } = useAuth();
  const { openModal: openAuthModal } = useAuthModalContext();

  // Data fetching
  const { events, meta, loading: listLoading, refetching: listRefetching, error: listError } = useEventsQuery(searchParams, initialData);

  // Handle 401 on "my" tab
  const currentTab = searchParams.get("tab") || "upcoming";
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
      if (value === null || value === "" || value === "upcoming") {
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

      {/* Events List Section */}
      {/* SSOT_UI_STRUCTURE — EventsGrid always renders; page chrome (tabs, search, filters) visible immediately */}
      {/* SSOT_UI_ASYNC_PATTERNS — loading/error states handled inside EventsGrid, only affecting list section */}
      <div className="relative">
        {listRefetching && events.length > 0 && <LoadingBar position="top" height={3} />}
        
        <EventsGrid
          events={events}
          meta={meta}
          currentUserId={currentUser?.id || null}
          isAuthenticated={isAuthenticated}
          loading={listLoading}
          error={listError}
          onTabChange={handleTabChange}
          onPageChange={handlePageChange}
          onSearchChange={handleSearchChange}
          onSortChange={handleSortChange}
          onCityChange={handleCityChange}
          onCategoryChange={handleCategoryChange}
        />
      </div>
    </div>
  );
}

