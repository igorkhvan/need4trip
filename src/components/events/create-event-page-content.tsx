"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { handleApiError } from "@/lib/utils/errors";
import { useProtectedAction } from "@/lib/hooks/use-protected-action";
import { usePaywall } from "@/components/billing/paywall-modal";
import { useClubData } from "@/hooks/use-club-data";

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
  
  // Load club data if clubId is provided
  const { club, loading, error: clubError } = useClubData({ 
    clubId, 
    skip: !isAuthenticated 
  });
  
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

  const handleSubmit = async (payload: Record<string, unknown>) => {
    console.log('[CreateEvent] Starting event creation with payload:', payload);
    
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    console.log('[CreateEvent] API response status:', res.status, res.statusText);
    
    if (!res.ok) {
      console.log('[CreateEvent] API request failed with status:', res.status);
      
      // ⚡ Billing v2.0: Handle paywall error (402)
      if (res.status === 402) {
        const errorData = await res.json();
        console.log('[CreateEvent] Paywall error (402):', errorData);
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
    
    // Success - redirect to created event page
    const response = await res.json();
    console.log('[CreateEvent] Full API response:', response);
    
    const createdEvent = response.data?.event || response.event;
    console.log('[CreateEvent] Extracted event:', createdEvent);
    console.log('[CreateEvent] Event ID:', createdEvent?.id);
    
    if (createdEvent?.id) {
      const targetUrl = `/events/${createdEvent.id}`;
      console.log('[CreateEvent] ✅ Redirecting to:', targetUrl);
      router.push(targetUrl);
    } else {
      // Fallback если нет id (не должно случиться, но на всякий случай)
      console.error('[CreateEvent] ❌ No event.id in response:', response);
      router.push('/events');
      router.refresh();
    }
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
