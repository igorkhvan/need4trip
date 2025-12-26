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
import { useAuth } from "@/components/auth/auth-provider";
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
  const { user } = useAuth();
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
  
  // Show credit banner if user has available credits
  const showCreditBanner = !!(user?.availableCreditsCount && user.availableCreditsCount > 0);
  
  return (
    <>
      {/* Credit Info Banner */}
      {showCreditBanner && user && (
        <div className="mb-6 rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary-bg)] p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-white p-2">
              <svg
                className="h-5 w-5 text-[var(--color-primary)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-[var(--color-text)] mb-1">
                У вас есть {user.availableCreditsCount || 0} апгрейд{(user.availableCreditsCount || 0) === 1 ? '' : (user.availableCreditsCount || 0) < 5 ? 'а' : 'ов'}!
              </h4>
              <p className="text-sm text-muted-foreground">
                Используйте для создания события до 500 участников. Апгрейд будет применён автоматически при необходимости.
              </p>
            </div>
          </div>
        </div>
      )}
      
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

