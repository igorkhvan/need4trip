/**
 * ClubEventsContent Component
 * 
 * Client component that fetches and displays Club Events.
 * Data source: GET /api/events?clubId=... (canonical listing endpoint, SSOT_API.md)
 * 
 * Per Visual Contract v1 — EVENTS:
 * - No optimistic UI
 * - Explicit refresh after mutations
 * - Section-level loading states
 * - Empty state when no events
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ClubEventsList } from "./club-events-list";
import { EventCardSkeletonGrid } from "@/components/ui/skeletons";
import type { Event } from "@/lib/types/event";
import type { ClubRole } from "@/lib/types/club";

interface ClubEventsContentProps {
  clubId: string;
  userRole: ClubRole | null;
  isArchived: boolean;
}

interface EventsListResponse {
  events: Event[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export function ClubEventsContent({
  clubId,
  userRole,
  isArchived,
}: ClubEventsContentProps) {
  // Events state
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per Visual Contract v1 — EVENTS §4.2: owner/admin can create
  const canCreate = userRole === "owner" || userRole === "admin";

  // Fetch events using canonical /api/events endpoint (SSOT_API.md)
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/events?clubId=${encodeURIComponent(clubId)}&tab=all&limit=50`);

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (response.status === 403) {
          setError("Нет доступа к событиям клуба. Вступите в клуб для просмотра.");
          return;
        }
        throw new Error("Не удалось загрузить события");
      }

      const data: EventsListResponse = await response.json();
      setEvents(data.events || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  // Initial data fetch
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Loading state
  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-[18px] font-semibold text-[var(--color-text)]">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <span>Все события</span>
        </h2>
        <EventCardSkeletonGrid count={3} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
        <div className="text-center py-8">
          <p className="text-[#DC2626]">{error}</p>
          <button
            onClick={fetchEvents}
            className="mt-4 text-[var(--color-primary)] hover:underline"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  // Empty state - per Visual Contract v1 — EVENTS §4.5
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
          <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">
            Пока нет событий
          </h3>
          <p className="mb-6 text-sm text-muted-foreground max-w-md">
            У клуба пока нет запланированных событий.
            {canCreate && !isArchived && " Создайте первое событие!"}
          </p>
          
          {/* Create Event button in empty state - per Visual Contract v1 — EVENTS §4.5 */}
          {canCreate && (
            isArchived ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button disabled className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        <span>Создать событие</span>
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Клуб в архиве — создание событий недоступно</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Button asChild className="flex items-center gap-2">
                <Link href={`/events/create?clubId=${clubId}`}>
                  <Plus className="h-4 w-4" />
                  <span>Создать событие</span>
                </Link>
              </Button>
            )
          )}
        </div>
      </div>
    );
  }

  // Events list
  return <ClubEventsList events={events} />;
}
