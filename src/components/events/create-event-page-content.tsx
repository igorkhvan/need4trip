"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { EventForm } from "@/components/events/event-form";
import { handleApiError } from "@/lib/utils/errors";
import type { Club } from "@/lib/types/club";

export function CreateEventPageContent() {
  const searchParams = useSearchParams();
  const clubId = searchParams?.get("clubId");
  
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(!!clubId);

  // Load club data if clubId is provided
  useEffect(() => {
    if (!clubId) return;
    
    const loadClub = async () => {
      try {
        const res = await fetch(`/api/clubs/${clubId}`);
        if (!res.ok) throw new Error("Failed to load club");
        const data = await res.json();
        setClub(data.club);
      } catch (error) {
        console.error("Failed to load club:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadClub();
  }, [clubId]);

  const handleSubmit = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      await handleApiError(res);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-[#FF6F2C] mb-4"></div>
          <p className="text-[#6B7280]">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Pre-fill cityId if club has cities
  const initialCityId = club?.cities?.[0]?.id ?? null;

  return (
    <EventForm
      mode="create"
      backHref="/events"
      submitLabel="Создать событие"
      headerTitle={club ? `Создание события для ${club.name}` : "Создание события"}
      headerDescription="Заполните информацию о вашей автомобильной поездке"
      onSubmit={handleSubmit}
      initialValues={{
        isClubEvent: !!clubId,
        cityId: initialCityId,
      }}
      club={club}
    />
  );
}

