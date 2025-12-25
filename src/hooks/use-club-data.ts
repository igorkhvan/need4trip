/**
 * useClubData Hook
 * 
 * Loads single club details by ID.
 * Used in event creation/editing when club context is needed.
 * 
 * @returns Club data, loading, error
 * 
 * @example
 * ```tsx
 * const { club, loading, error } = useClubData(clubId);
 * 
 * if (loading) return <ClubSkeleton />;
 * if (error) return <ErrorAlert message={error} />;
 * if (!club) return null;
 * 
 * return <EventForm club={club} />;
 * ```
 */

import { useState, useEffect } from "react";
import { parseApiResponse, ClientError, getErrorMessage } from "@/lib/types/errors";
import { log } from "@/lib/utils/logger";
import type { Club } from "@/lib/types/club";

// ============================================================================
// Types
// ============================================================================

interface UseClubDataOptions {
  clubId: string | null | undefined;
  skip?: boolean; // Skip fetching (e.g. when not authenticated)
}

interface UseClubDataReturn {
  club: Club | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useClubData(
  clubIdOrOptions: string | null | undefined | UseClubDataOptions
): UseClubDataReturn {
  // Normalize input
  const options: UseClubDataOptions = 
    typeof clubIdOrOptions === 'string' || clubIdOrOptions === null || clubIdOrOptions === undefined
      ? { clubId: clubIdOrOptions }
      : clubIdOrOptions;

  const { clubId, skip = false } = options;

  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(!!clubId && !skip);
  const [error, setError] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    // Skip if no clubId or skip flag is set
    if (!clubId || skip) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const loadClub = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/clubs/${clubId}`);
        const data = await parseApiResponse<{ club: Club }>(res);

        if (!mounted) return;

        setClub(data.club);
      } catch (err) {
        if (!mounted) return;

        if (err instanceof ClientError) {
          const message = getErrorMessage(err);
          setError(message);
          log.error('[useClubData] Failed to load club', {
            code: err.code,
            statusCode: err.statusCode,
            clubId
          });
        } else {
          setError('Не удалось загрузить клуб');
          log.error('[useClubData] Unexpected error', { error: err, clubId });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadClub();

    return () => {
      mounted = false;
    };
  }, [clubId, skip, reloadTrigger]);

  const reload = () => {
    setReloadTrigger(prev => prev + 1);
  };

  return {
    club,
    loading,
    error,
    reload,
  };
}

