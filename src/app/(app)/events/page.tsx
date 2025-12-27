"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EventsGrid } from "@/components/events/events-grid";
import { useAuth } from "@/components/auth/auth-provider";
import { useAuthModalContext } from "@/components/auth/auth-modal-provider";
import { parseApiResponse, ClientError } from "@/lib/types/errors";
import { log } from "@/lib/utils/logger";
import { EventListItemHydrated } from "@/lib/services/events";

interface EventsPageProps {
  searchParams?: { 
    tab?: string;
    page?: string;
    search?: string;
    sort?: string;
    cityId?: string;
    categoryId?: string;
  };
}

interface EventsMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export default function EventsPage({ searchParams }: EventsPageProps) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const { user: currentUser, isAuthenticated } = useAuth();
  const { openModal: openAuthModal } = useAuthModalContext();
  
  const [events, setEvents] = useState<EventListItemHydrated[]>([]);
  const [meta, setMeta] = useState<EventsMeta | null>(null);
  const [stats, setStats] = useState<{ total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Read params from URL (single source of truth)
  const tab = urlSearchParams.get("tab") || "all";
  const page = parseInt(urlSearchParams.get("page") || "1", 10);
  const search = urlSearchParams.get("search") || undefined;
  const sort = urlSearchParams.get("sort") || "date";
  const cityId = urlSearchParams.get("cityId") || undefined;
  const categoryId = urlSearchParams.get("categoryId") || undefined;

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        // Build query params
        const params = new URLSearchParams();
        params.set("tab", tab);
        params.set("page", page.toString());
        params.set("sort", sort);
        if (search) params.set("search", search);
        if (cityId) params.set("cityId", cityId);
        if (categoryId) params.set("categoryId", categoryId);

        // Load events + stats in parallel
        const [eventsRes, statsRes] = await Promise.all([
          fetch(`/api/events?${params.toString()}`, { cache: 'no-store' }),
          fetch(`/api/events/stats?${params.toString()}`, { cache: 'no-store' }),
        ]);

        // Handle 401 for tab=my without auth
        if (eventsRes.status === 401 && tab === "my") {
          openAuthModal();
          setEvents([]);
          setMeta(null);
          setStats(null);
          setLoading(false);
          return;
        }

        const eventsData = await parseApiResponse<{ events: EventListItemHydrated[]; meta: EventsMeta }>(eventsRes);
        const statsData = await parseApiResponse<{ total: number }>(statsRes);

        setEvents(eventsData.events || []);
        setMeta(eventsData.meta);
        setStats(statsData);
      } catch (err) {
        if (err instanceof ClientError) {
          log.error("Failed to load events", { code: err.code });
          setError(err.message);
        } else {
          log.error("Unexpected error loading events", { error: err });
          setError("Не удалось загрузить события");
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [tab, page, search, sort, cityId, categoryId, openAuthModal]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-20 bg-gray-200 rounded-xl" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="h-24 bg-gray-200 rounded-xl" />
          <div className="h-24 bg-gray-200 rounded-xl" />
          <div className="h-24 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <EventsGrid 
      events={events}
      meta={meta}
      stats={stats}
      currentUserId={currentUser?.id || null} 
      isAuthenticated={isAuthenticated}
      onTabChange={(newTab) => {
        const params = new URLSearchParams(urlSearchParams.toString());
        params.set("tab", newTab);
        params.delete("page"); // Reset page on tab change
        router.push(`/events?${params.toString()}`);
      }}
      onPageChange={(newPage) => {
        const params = new URLSearchParams(urlSearchParams.toString());
        params.set("page", newPage.toString());
        router.push(`/events?${params.toString()}`, { scroll: false });
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      onSearchChange={(newSearch) => {
        const params = new URLSearchParams(urlSearchParams.toString());
        if (newSearch) {
          params.set("search", newSearch);
        } else {
          params.delete("search");
        }
        params.delete("page"); // Reset page on search change
        router.push(`/events?${params.toString()}`);
      }}
      onSortChange={(newSort) => {
        const params = new URLSearchParams(urlSearchParams.toString());
        params.set("sort", newSort);
        router.push(`/events?${params.toString()}`, { scroll: false });
      }}
      onCityChange={(newCityId) => {
        const params = new URLSearchParams(urlSearchParams.toString());
        if (newCityId && newCityId !== "all") {
          params.set("cityId", newCityId);
        } else {
          params.delete("cityId");
        }
        params.delete("page"); // Reset page on filter change
        router.push(`/events?${params.toString()}`);
      }}
      onCategoryChange={(newCategoryId) => {
        const params = new URLSearchParams(urlSearchParams.toString());
        if (newCategoryId && newCategoryId !== "all") {
          params.set("categoryId", newCategoryId);
        } else {
          params.delete("categoryId");
        }
        params.delete("page"); // Reset page on filter change
        router.push(`/events?${params.toString()}`);
      }}
    />
  );
}
