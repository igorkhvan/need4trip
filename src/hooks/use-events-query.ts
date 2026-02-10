/**
 * useEventsQuery Hook
 * 
 * Fetches events list from /api/events with abort control and race condition guard.
 * Supports server-provided initial data for SSR (SSOT_SEO.md §4.1).
 * 
 * Pattern: Stale-While-Revalidate
 * - initialData from SSR → shown immediately (no skeleton)
 * - useEffect fires on mount → fetches fresh data in background (refetching indicator)
 * - Auth users get personalized data on first client fetch automatically
 * 
 * @param searchParams - URL search params (ReadonlyURLSearchParams)
 * @param initialData - Optional server-fetched initial data
 * @returns { events, meta, loading, refetching, error }
 */

"use client";

import { useEffect, useState, useRef } from "react";
import { ReadonlyURLSearchParams } from "next/navigation";
import { parseApiResponse, ClientError } from "@/lib/types/errors";
import { EventListItemHydrated } from "@/lib/services/events";
import { log } from "@/lib/utils/logger";

export interface EventsMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

interface EventsQueryResult {
  events: EventListItemHydrated[];
  meta: EventsMeta | null;
  loading: boolean;
  refetching: boolean;
  error: string | null;
}

export interface EventsInitialData {
  events: EventListItemHydrated[];
  meta: EventsMeta;
}

export function useEventsQuery(
  searchParams: ReadonlyURLSearchParams,
  initialData?: EventsInitialData
): EventsQueryResult {
  const [events, setEvents] = useState<EventListItemHydrated[]>(
    initialData?.events ?? []
  );
  const [meta, setMeta] = useState<EventsMeta | null>(initialData?.meta ?? null);
  const [loading, setLoading] = useState(!initialData?.events?.length);
  const [refetching, setRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Request ID для защиты от race conditions
  const requestIdRef = useRef(0);

  useEffect(() => {
    const currentRequestId = ++requestIdRef.current;
    const abortController = new AbortController();

    async function fetchEvents() {
      // Stale-while-revalidate:
      // - No data yet → loading=true (full skeleton)
      // - Has data (from SSR or previous fetch) → refetching=true (subtle indicator)
      if (events.length === 0 && meta === null) {
        setLoading(true);
      } else {
        setRefetching(true);
      }
      setError(null);

      try {
        // Build query params
        const params = new URLSearchParams();
        searchParams.forEach((value, key) => {
          params.set(key, value);
        });

        // Fetch events
        const response = await fetch(`/api/events?${params.toString()}`, {
          cache: 'no-store',
          signal: abortController.signal,
        });

        // Race condition guard: ignore if newer request started
        if (currentRequestId !== requestIdRef.current) {
          return;
        }

        // Handle 401 (unauthenticated on "my" tab)
        if (response.status === 401) {
          setEvents([]);
          setMeta(null);
          setLoading(false);
          return;
        }

        const data = await parseApiResponse<{ events: EventListItemHydrated[]; meta: EventsMeta }>(response);

        // Double-check race condition after async operation
        if (currentRequestId !== requestIdRef.current) {
          return;
        }

        setEvents(data.events || []);
        setMeta(data.meta);
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        // Race condition guard
        if (currentRequestId !== requestIdRef.current) {
          return;
        }

        if (err instanceof ClientError) {
          log.error("Failed to load events", { code: err.code });
          setError(err.message);
        } else {
          log.error("Unexpected error loading events", { error: err });
          setError("Не удалось загрузить события");
        }
      } finally {
        // Race condition guard
        if (currentRequestId === requestIdRef.current) {
          setLoading(false);
          setRefetching(false);
        }
      }
    }

    fetchEvents();

    // Cleanup: abort request on unmount or param change
    return () => {
      abortController.abort();
    };
  }, [searchParams]);

  return { events, meta, loading, refetching, error };
}
