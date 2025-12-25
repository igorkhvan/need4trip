"use client";

import { useEffect, useState } from "react";
import { EventsGrid } from "@/components/events/events-grid";
import { Event } from "@/lib/types/event";
import { useScrollRestoration } from "@/hooks/use-scroll-restoration";
import { useAuth } from "@/components/auth/auth-provider";
import { parseApiResponse, ClientError } from "@/lib/types/errors";
import { log } from "@/lib/utils/logger";

interface EventsPageProps {
  searchParams?: { 
    city?: string;
    tab?: string;
  };
}

export default function EventsPage({ searchParams }: EventsPageProps) {
  // ⚡ PERFORMANCE: Use auth context instead of fetching /api/auth/me
  const { user: currentUser, isAuthenticated } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Restore scroll position
  useScrollRestoration("events-list");

  useEffect(() => {
    async function loadData() {
      try {
        const eventsRes = await fetch("/api/events", { cache: 'no-store' });
        const data = await parseApiResponse<{ events: Event[]; total: number }>(eventsRes);
        setEvents(data.events || []);
      } catch (error) {
        if (error instanceof ClientError) {
          log.error("Failed to load events", { code: error.code });
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

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

  return (
    <EventsGrid 
      events={events} 
      currentUserId={currentUser?.id || null} 
      isAuthenticated={isAuthenticated}
    />
  );
}
