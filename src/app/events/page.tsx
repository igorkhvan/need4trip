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
        console.log('[EventsPage] Loading data...');
        const [eventsRes, userRes] = await Promise.all([
          fetch("/api/events"),
          fetch("/api/auth/me"),
        ]);

        console.log('[EventsPage] Events response:', {
          ok: eventsRes.ok,
          status: eventsRes.status,
        });

        if (eventsRes.ok) {
          const data = await eventsRes.json();
          console.log('[EventsPage] Events data:', {
            eventsCount: data.events?.length || 0,
            total: data.total,
            events: data.events,
          });
          setEvents(data.events || []);
        } else {
          console.error('[EventsPage] Events request failed:', eventsRes.status);
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
      <div className="page-container py-12">
        <div className="animate-pulse space-y-8">
          <div className="h-20 bg-gray-200 rounded-xl" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="h-24 bg-gray-200 rounded-xl" />
            <div className="h-24 bg-gray-200 rounded-xl" />
            <div className="h-24 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container py-12">
      <EventsGrid 
        events={events} 
        currentUserId={currentUserId} 
        isAuthenticated={isAuthenticated}
      />
    </div>
  );
}
