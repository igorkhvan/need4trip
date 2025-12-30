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
import type { ClubWithMembership } from "@/lib/types/club";
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
  manageableClubs: ClubWithMembership[];
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
  
  // SSOT §4: Club selection state
  const [isClubEvent, setIsClubEvent] = useState(false);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [planLimits, setPlanLimits] = useState<ClubPlanLimits>(defaultPlanLimits);
  
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
  
  // SSOT §4.2: Auto-select if exactly one manageable club
  useEffect(() => {
    if (manageableClubs.length === 1 && isClubEvent && !selectedClubId) {
      setSelectedClubId(manageableClubs[0].id);
    }
  }, [manageableClubs, isClubEvent, selectedClubId]);
  
  // Update plan limits when club is selected
  useEffect(() => {
    async function updatePlanLimits() {
      if (!selectedClubId) {
        setPlanLimits(defaultPlanLimits);
        return;
      }
      
      // Fetch club plan limits
      try {
        const res = await fetch(`/api/clubs/${selectedClubId}`);
        if (res.ok) {
          const data = await res.json();
          const club = data.data?.club || data.club;
          if (club?.subscription?.plan) {
            const plan = club.subscription.plan;
            setPlanLimits({
              maxMembers: plan.maxMembers,
              maxEventParticipants: plan.maxEventParticipants,
              allowPaidEvents: plan.allowPaidEvents,
              allowCsvExport: plan.allowCsvExport,
            });
          }
        }
      } catch (err) {
        console.error("Failed to load club plan limits", err);
      }
    }
    
    updatePlanLimits();
  }, [selectedClubId, defaultPlanLimits]);
  
  const handleSubmit = async (payload: Record<string, unknown>, retryWithCredit = false) => {
    // SSOT §4.3: Inject clubId based on checkbox state
    const finalPayload = {
      ...payload,
      clubId: isClubEvent ? selectedClubId : null,
    };
    
    // DEFENSIVE: Prevent credit retry for club events (SSOT §1.3 No Mixing)
    // Even if a bug triggers 409 for club event, do not retry with confirm_credit=1
    if (retryWithCredit && isClubEvent) {
      console.error("[BUG] Attempted credit retry for club event — blocked by client guard");
      throw new Error("Кредиты не могут быть использованы для клубных событий");
    }
    
    const url = retryWithCredit ? "/api/events?confirm_credit=1" : "/api/events";
    
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(finalPayload),
    });
    
    // Handle 409 CREDIT_CONFIRMATION_REQUIRED
    if (res.status === 409) {
      const error409 = await res.json();
      const meta = error409.error?.meta;
      
      // DEFENSIVE: Do not show credit confirmation for club events
      if (meta && !isClubEvent) {
        setPendingPayload(finalPayload); // Save payload for retry
        showConfirmation({
          creditCode: meta.creditCode,
          eventId: meta.eventId,
          requestedParticipants: meta.requestedParticipants,
        });
        return;
      }
      
      // If 409 for club event, treat as error (should never happen per backend)
      if (meta && isClubEvent) {
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
      
      {/* SSOT §4: Club Selection UI */}
      {manageableClubs.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isClubEvent"
              checked={isClubEvent}
              onChange={(e) => {
                setIsClubEvent(e.target.checked);
                if (!e.target.checked) {
                  setSelectedClubId(null);
                }
              }}
              className="h-5 w-5 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
            />
            <label htmlFor="isClubEvent" className="text-base font-medium text-[var(--color-text)] cursor-pointer">
              Создать событие от клуба
            </label>
          </div>
          
          {/* SSOT §4.2: Single club dropdown (shown only when checkbox ON) */}
          {isClubEvent && (
            <div className="space-y-2">
              <label htmlFor="clubSelect" className="text-sm font-medium text-[var(--color-text)]">
                Выберите клуб <span className="text-red-500">*</span>
              </label>
              <select
                id="clubSelect"
                value={selectedClubId || ""}
                onChange={(e) => setSelectedClubId(e.target.value || null)}
                className="w-full rounded-lg border border-[var(--color-border)] px-4 py-3 text-base text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                required={isClubEvent}
              >
                {manageableClubs.length > 1 && (
                  <option value="">Выберите клуб...</option>
                )}
                {manageableClubs.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name} ({club.userRole === "owner" ? "Владелец" : "Администратор"})
                  </option>
                ))}
              </select>
              {isClubEvent && !selectedClubId && manageableClubs.length > 1 && (
                <p className="text-sm text-red-500">Выберите клуб для создания события</p>
              )}
            </div>
          )}
        </div>
      )}
      
      <EventForm
        mode="create"
        backHref="/events"
        submitLabel="Создать событие"
        headerTitle={
          isClubEvent && selectedClubId 
            ? `Создание события для ${manageableClubs.find(c => c.id === selectedClubId)?.name || "клуба"}`
            : "Создание события"
        }
        headerDescription="Заполните информацию о вашей автомобильной поездке"
        planLimits={planLimits}
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

