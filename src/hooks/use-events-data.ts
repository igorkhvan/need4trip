/**
 * useEventsData Hook
 * 
 * Loads events list with filters and pagination.
 * Consolidates event fetching logic across multiple pages.
 * 
 * @returns Events, loading, error
 * 
 * @example
 * ```tsx
 * const { events, loading, error, reload } = useEventsData({ cityId });
 * 
 * if (loading) return <EventsSkeleton />;
 * if (error) return <ErrorAlert message={error} />;
 * 
 * return <EventsGrid events={events} />;
 * ```
 */

import { useState, useEffect } from "react";
import { parseApiResponse, ClientError, getErrorMessage } from "@/lib/types/errors";
import { log } from "@/lib/utils/logger";
import type { Event } from "@/lib/types/event";

// ============================================================================
// Types
// ============================================================================

interface UseEventsDataOptions {
  cityId?: string | null;
  clubId?: string | null;
  userId?: string | null;
  status?: 'upcoming' | 'past' | 'all';
  page?: number;
  limit?: number;
}

interface UseEventsDataReturn {
  events: Event[];
  total: number;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useEventsData(options: UseEventsDataOptions = {}): UseEventsDataReturn {
  const [events, setEvents] = useState<Event[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadEvents = async () => {
      setLoading(true);
      setError(null);

      try {
        // Build query params
        const params = new URLSearchParams();
        
        if (options.cityId) params.append('cityId', options.cityId);
        if (options.clubId) params.append('clubId', options.clubId);
        if (options.userId) params.append('userId', options.userId);
        if (options.status) params.append('status', options.status);
        if (options.page) params.append('page', options.page.toString());
        if (options.limit) params.append('limit', options.limit.toString());

        const url = `/api/events?${params.toString()}`;
        const res = await fetch(url, { cache: 'no-store' });
        const data = await parseApiResponse<{ events: Event[]; total: number }>(res);

        if (!mounted) return;

        setEvents(data.events || []);
        setTotal(data.total || 0);
      } catch (err) {
        if (!mounted) return;

        if (err instanceof ClientError) {
          const message = getErrorMessage(err);
          setError(message);
          log.error('[useEventsData] Failed to load events', {
            code: err.code,
            statusCode: err.statusCode,
            options
          });
        } else {
          setError('Не удалось загрузить события');
          log.error('[useEventsData] Unexpected error', { error: err });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadEvents();

    return () => {
      mounted = false;
    };
  }, [
    options.cityId,
    options.clubId,
    options.userId,
    options.status,
    options.page,
    options.limit,
    reloadTrigger
  ]);

  const reload = () => {
    setReloadTrigger(prev => prev + 1);
  };

  return {
    events,
    total,
    loading,
    error,
    reload,
  };
}

