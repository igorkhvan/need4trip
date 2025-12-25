/**
 * useClubsData Hook
 * 
 * Loads clubs list with search, city filter, and pagination.
 * Consolidates club fetching logic.
 * 
 * @returns Clubs, loading, error
 * 
 * @example
 * ```tsx
 * const { clubs, total, loading, error } = useClubsData({ 
 *   cityId, 
 *   searchQuery, 
 *   page 
 * });
 * 
 * if (loading) return <ClubsSkeleton />;
 * return <ClubsGrid clubs={clubs} total={total} />;
 * ```
 */

import { useState, useEffect } from "react";
import { parseApiResponse, ClientError, getErrorMessage } from "@/lib/types/errors";
import { log } from "@/lib/utils/logger";
import type { Club } from "@/lib/types/club";

// ============================================================================
// Types
// ============================================================================

interface UseClubsDataOptions {
  cityId?: string | null;
  searchQuery?: string | null;
  page?: number;
  limit?: number;
}

interface UseClubsDataReturn {
  clubs: Club[];
  total: number;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useClubsData(options: UseClubsDataOptions = {}): UseClubsDataReturn {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadClubs = async () => {
      setLoading(true);
      setError(null);

      try {
        // Build query params
        const params = new URLSearchParams();
        
        if (options.page) params.append('page', options.page.toString());
        if (options.limit) params.append('limit', options.limit.toString());
        
        if (options.cityId) {
          params.append('cityId', options.cityId);
        } else if (options.searchQuery?.trim()) {
          params.append('q', options.searchQuery.trim());
        }

        const url = `/api/clubs?${params.toString()}`;
        const res = await fetch(url);
        const data = await parseApiResponse<{ clubs: Club[]; total: number }>(res);

        if (!mounted) return;

        setClubs(data.clubs || []);
        setTotal(data.total || 0);
      } catch (err) {
        if (!mounted) return;

        if (err instanceof ClientError) {
          const message = getErrorMessage(err);
          setError(message);
          log.error('[useClubsData] Failed to load clubs', {
            code: err.code,
            statusCode: err.statusCode,
            options
          });
        } else {
          setError('Не удалось загрузить клубы');
          log.error('[useClubsData] Unexpected error', { error: err });
        }
        
        // Clear clubs on error
        setClubs([]);
        setTotal(0);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadClubs();

    return () => {
      mounted = false;
    };
  }, [
    options.cityId,
    options.searchQuery,
    options.page,
    options.limit,
    reloadTrigger
  ]);

  const reload = () => {
    setReloadTrigger(prev => prev + 1);
  };

  return {
    clubs,
    total,
    loading,
    error,
    reload,
  };
}

