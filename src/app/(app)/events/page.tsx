"use client";

import { useEffect, useState } from "react";
import { EventsGrid } from "@/components/events/events-grid";
import { Event } from "@/lib/types/event";

interface EventsPageProps {
  searchParams?: { city?: string };
}

export default function EventsPage({ searchParams }: EventsPageProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [eventsRes, userRes] = await Promise.all([
          fetch("/api/events", { cache: 'no-store' }),
          fetch("/api/auth/me", { cache: 'no-store' }),
        ]);

        if (eventsRes.ok) {
          const response = await eventsRes.json();
          // API returns: {success: true, data: {events: [...], total: ...}}
          const data = response.data || response;
          setEvents(data.events || []);
        }

        if (userRes.ok) {
          const userData = await userRes.json();
          setCurrentUserId(userData.user?.id || null);
          setIsAuthenticated(!!userData.user);
        }
      } catch (error) {
        console.error("Failed to load events:", error);
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
      currentUserId={currentUserId} 
      isAuthenticated={isAuthenticated}
    />
  );
}
