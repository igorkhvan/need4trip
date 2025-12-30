/**
 * Create Event Page Client Component
 * 
 * Получает готовые данные от серверного компонента:
 * - manageableClubs (clubs where user has owner/admin role)
 * - defaultPlanLimits (FREE plan, will be updated when club selected)
 * - userCityId (for pre-filling city)
 * 
 * SSOT §4: Implements checkbox + single dropdown for club selection
 */

"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { handleApiError } from "@/lib/utils/errors";
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
  manageableClubs: Array<{
    id: string;
    name: string;
    userRole: "owner" | "admin";
  }>;
  defaultPlanLimits: ClubPlanLimits;
  legacyClubId: string | null; // Backward compat for ?clubId=X
}

export function CreateEventPageClient({
  isAuthenticated,
  userCityId,
  manageableClubs,
  defaultPlanLimits,
  legacyClubId,
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
        redirectTo: '/events/create',
      }
    );
  }, [isAuthenticated, execute]);
  
  const handleSubmit = async (payload: Record<string, unknown>, retryWithCredit = false) => {
    // DEFENSIVE: Prevent credit retry for club events (SSOT §1.3 No Mixing)
    // Even if a bug triggers 409 for club event, do not retry with confirm_credit=1
    const clubId = payload.clubId as string | null;
    if (retryWithCredit && clubId) {
      console.error("[BUG] Attempted credit retry for club event — blocked by client guard");
      throw new Error("Кредиты не могут быть использованы для клубных событий");
    }
    
    const url = retryWithCredit ? "/api/events?confirm_credit=1" : "/api/events";
    
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload), // clubId already in payload from EventForm
    });
    
    // Handle 409 CREDIT_CONFIRMATION_REQUIRED
    if (res.status === 409) {
      const error409 = await res.json();
      const meta = error409.error?.meta;
      
      // DEFENSIVE: Do not show credit confirmation for club events
      const clubId = payload.clubId as string | null;
      if (meta && !clubId) {
        setPendingPayload(payload); // Save payload for retry (no modification needed)
        showConfirmation({
          creditCode: meta.creditCode,
          eventId: meta.eventId,
          requestedParticipants: meta.requestedParticipants,
        });
        return;
      }
      
      // If 409 for club event, treat as error (should never happen per backend)
      if (meta && clubId) {
        console.error("[BUG] Backend returned 409 for club event — this should not happen");
        throw new Error("Ошибка биллинга. Клубные события не используют кредиты.");
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
    
    // Success - redirect to created event page
    const response = await res.json();
    const createdEvent = response.data?.event || response.event;
    
    if (createdEvent?.id) {
      router.push(`/events/${createdEvent.id}`);
    } else {
      // Fallback если нет id (не должно случиться, но на всякий случай)
      console.error('[CreateEvent] No event.id in response:', response);
      router.push('/events');
      router.refresh();
    }
  };
  
  // Show nothing while auth check happens
  if (!isAuthenticated) {
    return null; // Modal will show
  }
  
  // Pre-fill cityId: prioritize user's city
  const initialCityId = userCityId ?? null;
  
  // Show credit banner if user has available credits
  const showCreditBanner = !!(user?.availableCreditsCount && user.availableCreditsCount > 0);
  
  return (
    <div className={showCreditBanner ? "space-y-6" : ""}>
      {/* Credit Info Banner */}
      {showCreditBanner && user && (
        <div className="rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary-bg)] p-4">
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
                Используйте для создания личного события до 500 участников. Апгрейд может быть использован при публикации с вашим подтверждением.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <EventForm
        mode="create"
        backHref="/events"
        submitLabel="Создать событие"
        headerTitle="Создание события"
        headerDescription="Заполните информацию о вашей автомобильной поездке"
        manageableClubs={manageableClubs}
        planLimits={defaultPlanLimits}
        onSubmit={handleSubmit}
        initialValues={{
          cityId: initialCityId || "",
        }}
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
    </div>
  );
}

