/**
 * useEventsStats Hook
 * 
 * Fetches events statistics from /api/events/stats with abort control and race condition guard.
 * Stats should refetch ONLY when tab/filters change, NOT when page changes.
 * 
 * @param searchParams - URL search params WITHOUT "page" parameter
 * @returns { stats, loading, error }
 */

"use client";

import { useEffect, useState, useRef } from "react";
import { ReadonlyURLSearchParams } from "next/navigation";
import { parseApiResponse, ClientError } from "@/lib/types/errors";
import { log } from "@/lib/utils/logger";

interface EventsStats {
  total: number;
}

interface EventsStatsResult {
  stats: EventsStats | null;
  loading: boolean;
  error: string | null;
}

export function useEventsStats(searchParams: ReadonlyURLSearchParams): EventsStatsResult {
  const [stats, setStats] = useState<EventsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Request ID для защиты от race conditions
  const requestIdRef = useRef(0);

  useEffect(() => {
    const currentRequestId = ++requestIdRef.current;
    const abortController = new AbortController();

    async function fetchStats() {
      setLoading(true);
      setError(null);

      try {
        // Build query params (excluding "page")
        const params = new URLSearchParams();
        searchParams.forEach((value, key) => {
          if (key !== "page") {
            params.set(key, value);
          }
        });

        // Fetch stats
        const response = await fetch(`/api/events/stats?${params.toString()}`, {
          cache: 'no-store',
          signal: abortController.signal,
        });

        // Race condition guard: ignore if newer request started
        if (currentRequestId !== requestIdRef.current) {
          return;
        }

        // Handle 401 (unauthenticated)
        if (response.status === 401) {
          setStats(null);
          setLoading(false);
          return;
        }

        const data = await parseApiResponse<{ total: number }>(response);

        // Double-check race condition after async operation
        if (currentRequestId !== requestIdRef.current) {
          return;
        }

        setStats(data);
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
          log.error("Failed to load events stats", { code: err.code });
          setError(err.message);
        } else {
          log.error("Unexpected error loading events stats", { error: err });
          setError("Не удалось загрузить статистику");
        }
      } finally {
        // Race condition guard
        if (currentRequestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }

    fetchStats();

    // Cleanup: abort request on unmount or param change
    return () => {
      abortController.abort();
    };
  }, [searchParams]);

  return { stats, loading, error };
}

