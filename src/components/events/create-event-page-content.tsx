"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { handleApiError } from "@/lib/utils/errors";
import type { Club } from "@/lib/types/club";
import { useProtectedAction } from "@/lib/hooks/use-protected-action";
import { usePaywall } from "@/components/billing/PaywallModal";

// Динамический импорт формы события для code splitting
const EventForm = dynamic(
  () => import("@/components/events/event-form").then((mod) => ({ default: mod.EventForm })),
  { ssr: false }
);

export function CreateEventPageContent({ 
  isAuthenticated,
  userCityId = null,
}: { 
  isAuthenticated: boolean;
  userCityId?: string | null;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const clubId = searchParams?.get("clubId");
  
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(!!clubId);
  
  // ⚡ Billing v2.0: Paywall hook
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

  // Load club data if clubId is provided
  useEffect(() => {
    if (!clubId || !isAuthenticated) return;
    
    const loadClub = async () => {
      try {
        const res = await fetch(`/api/clubs/${clubId}`);
        if (!res.ok) throw new Error("Failed to load club");
        const response = await res.json();
        const data = response.data || response;
        setClub(data.club);
      } catch (error) {
        console.error("Failed to load club:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadClub();
  }, [clubId, isAuthenticated]);

  const handleSubmit = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      // ⚡ Billing v2.0: Handle paywall error (402)
      if (res.status === 402) {
        const errorData = await res.json();
        const paywallError = errorData.error?.details || errorData.error;
        
        if (paywallError) {
          showPaywall(paywallError);
          return; // Don't show additional error
        }
      }
      
      // Handle other errors
      await handleApiError(res);
      return;
    }
    
    // Success - redirect to events list with force refresh to show new event
    router.push('/events');
    router.refresh();
  };

  // Show loading or empty state while auth check happens
  if (!isAuthenticated) {
    return null; // Modal will show, don't render anything
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-[#FF6F2C] mb-4"></div>
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
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
        onSubmit={handleSubmit}
        initialValues={{
          isClubEvent: !!clubId,
          cityId: initialCityId || "",
        }}
        club={club}
      />
      
      {/* ⚡ Billing v2.0: Paywall Modal */}
      {PaywallModalComponent}
    </>
  );
}
