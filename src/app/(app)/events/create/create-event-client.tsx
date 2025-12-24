/**
 * Create Event Page Client Component
 * 
 * Получает готовые данные от серверного компонента:
 * - club (если создается club event)
 * - planLimits (from club plan or FREE plan)
 * - userCityId (for pre-filling city)
 */

"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { handleApiError } from "@/lib/utils/errors";
import type { Club } from "@/lib/types/club";
import { useProtectedAction } from "@/lib/hooks/use-protected-action";
import { usePaywall } from "@/components/billing/PaywallModal";
import type { ClubPlanLimits } from "@/hooks/use-club-plan";

// Динамический импорт формы события для code splitting
const EventForm = dynamic(
  () => import("@/components/events/event-form").then((mod) => ({ default: mod.EventForm })),
  { ssr: false }
);

interface CreateEventPageClientProps {
  isAuthenticated: boolean;
  userCityId: string | null;
  club: Club | null;
  planLimits: ClubPlanLimits;
  clubId: string | null;
}

export function CreateEventPageClient({
  isAuthenticated,
  userCityId,
  club,
  planLimits,
  clubId,
}: CreateEventPageClientProps) {
  const router = useRouter();
  const { showPaywall, PaywallModalComponent } = usePaywall();
  const { execute } = useProtectedAction(isAuthenticated);
  
  // Protect page access
  useEffect(() => {
    execute(
      () => {}, // Do nothing if authenticated (already on page)
      {
        reason: "REQUIRED",
        title: "Создание события",
        description: "Для создания события необходимо войти через Telegram.",
        redirectTo: clubId ? `/events/create?clubId=${clubId}` : '/events/create',
      }
    );
  }, [isAuthenticated, execute, clubId]);
  
  const handleSubmit = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      // Handle paywall error (402)
      if (res.status === 402) {
        const errorData = await res.json();
        const paywallError = errorData.error?.details || errorData.error;
        
        if (paywallError) {
          showPaywall(paywallError);
          return;
        }
      }
      
      // Handle other errors
      await handleApiError(res);
      return;
    }
    
    // Success - redirect to events list
    router.push('/events');
    router.refresh();
  };
  
  // Show nothing while auth check happens
  if (!isAuthenticated) {
    return null; // Modal will show
  }
  
  // Pre-fill cityId: prioritize user's city, fallback to club's first city
  const initialCityId = userCityId ?? club?.cities?.[0]?.id ?? null;
  
  return (
    <>
      <EventForm
        mode="create"
        backHref="/events"
        submitLabel="Создать событие"
        headerTitle={club ? `Создание события для ${club.name}` : "Создание события"}
        headerDescription="Заполните информацию о вашей автомобильной поездке"
        planLimits={planLimits}
        onSubmit={handleSubmit}
        initialValues={{
          isClubEvent: !!clubId,
          cityId: initialCityId || "",
        }}
        club={club}
      />
      
      {/* Paywall Modal */}
      {PaywallModalComponent}
    </>
  );
}

