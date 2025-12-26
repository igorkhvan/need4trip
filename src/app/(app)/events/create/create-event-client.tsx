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
import { usePaywall } from "@/components/billing/paywall-modal";
import { useCreditConfirmation, CreditConfirmationModal } from "@/components/billing/credit-confirmation-modal";
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
  const { showConfirmation, hideConfirmation, modalState } = useCreditConfirmation();
  const { execute } = useProtectedAction(isAuthenticated);
  const [pendingPayload, setPendingPayload] = useState<Record<string, unknown> | null>(null);
  
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
  
  const handleSubmit = async (payload: Record<string, unknown>, retryWithCredit = false) => {
    const url = retryWithCredit ? "/api/events?confirm_credit=1" : "/api/events";
    
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    // Handle 409 CREDIT_CONFIRMATION_REQUIRED
    if (res.status === 409) {
      const error409 = await res.json();
      const meta = error409.error?.meta;
      
      if (meta) {
        setPendingPayload(payload); // Save payload for retry
        showConfirmation({
          creditCode: meta.creditCode,
          eventId: meta.eventId,
          requestedParticipants: meta.requestedParticipants,
        });
        return;
      }
    }
    
    // Handle 402 PAYWALL
    if (res.status === 402) {
      const errorData = await res.json();
      const paywallError = errorData.error?.details || errorData.error;
      
      if (paywallError) {
        showPaywall(paywallError);
        return;
      }
    }
    
    // Handle other errors
    if (!res.ok) {
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
      
      {/* Credit Confirmation Modal */}
      {modalState.open && modalState.creditCode && (
        <CreditConfirmationModal
          open={modalState.open}
          onOpenChange={hideConfirmation}
          creditCode={modalState.creditCode}
          eventId={modalState.eventId!}
          requestedParticipants={modalState.requestedParticipants!}
          onConfirm={async () => {
            if (pendingPayload) {
              hideConfirmation();
              await handleSubmit(pendingPayload, true); // Retry with confirm_credit=1
            }
          }}
          onCancel={hideConfirmation}
        />
      )}
    </>
  );
}

