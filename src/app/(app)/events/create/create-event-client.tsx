/**
 * Create Event Page Client Component
 * 
 * Получает готовые данные от серверного компонента:
 * - manageableClubs (clubs where user has owner/admin role)
 * - defaultPlanLimits (FREE plan, will be updated when club selected)
 * - userCityId (for pre-filling city)
 * 
 * SSOT §4: Implements checkbox + single dropdown for club selection
 * 
 * ⚡ NEW: Uses ActionController for race-condition-free async operations
 * SSOT: docs/ssot/SSOT_ARCHITECTURE.md § ActionController Standard
 */

"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { handleApiError } from "@/lib/utils/errors";
import { useProtectedAction } from "@/lib/hooks/use-protected-action";
import { usePaywall } from "@/components/billing/paywall-modal";
import { CreditConfirmationModal } from "@/components/billing/credit-confirmation-modal";
import { useAuth } from "@/components/auth/auth-provider";
import { useActionController } from "@/lib/ui/actionController";
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
  const { execute } = useProtectedAction(isAuthenticated);
  
  // ⚡ NEW: ActionController for race-condition-free operations
  const controller = useActionController<{
    payload: Record<string, unknown>;
    creditCode?: string;
    eventId?: string;
    requestedParticipants?: number;
  }>();
  
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
  
  const handleSubmit = async (payload: Record<string, unknown>) => {
    // DEFENSIVE: Prevent credit retry for club events (SSOT §1.3 No Mixing)
    const clubId = payload.clubId as string | null;
    
    await controller.start("create_event", async () => {
      // Build request URL and headers
      const url = "/api/events";
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      
      // ⚡ NEW: Add Idempotency-Key header (prevents duplicates)
      if (controller.correlationId) {
        headers["Idempotency-Key"] = controller.correlationId;
      }
      
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      
      // Handle 409 CREDIT_CONFIRMATION_REQUIRED
      if (res.status === 409) {
        const error409 = await res.json();
        const meta = error409.error?.meta;
        
        // DEFENSIVE: Do not show credit confirmation for club events
        if (meta && !clubId) {
          // ⚡ NEW: Store payload in controller and await confirmation
          controller.awaitConfirmation({
            payload,
            creditCode: meta.creditCode,
            eventId: meta.eventId,
            requestedParticipants: meta.requestedParticipants,
          });
          return;
        }
        
        // If 409 for club event, treat as error
        if (meta && clubId) {
          console.error("[BUG] Backend returned 409 for club event");
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
      
      // ✅ Success - mark as redirecting BEFORE navigation
      const response = await res.json();
      const createdEvent = response.data?.event || response.event;
      
      controller.setRedirecting();
      
      if (createdEvent?.id) {
        router.push(`/events/${createdEvent.id}`);
      } else {
        console.error('[CreateEvent] No event.id in response:', response);
        router.push('/events');
      }
      router.refresh();
    });
  };
  
  // ⚡ NEW: Handle credit confirmation
  const handleConfirmCredit = async () => {
    await controller.confirm(async (stored) => {
      const { payload, creditCode } = stored;
      
      // Build confirmed request
      const url = "/api/events?confirm_credit=1";
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      
      // ⚡ CRITICAL: Reuse SAME Idempotency-Key for retry
      if (controller.correlationId) {
        headers["Idempotency-Key"] = controller.correlationId;
      }
      
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      
      // Handle 402 PAYWALL (fallback if credit was consumed by another request)
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
      
      // ✅ Success - mark as redirecting BEFORE navigation
      const response = await res.json();
      const createdEvent = response.data?.event || response.event;
      
      controller.setRedirecting();
      
      if (createdEvent?.id) {
        router.push(`/events/${createdEvent.id}`);
      } else {
        router.push('/events');
      }
      router.refresh();
    });
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
        // ⚡ NEW: Pass ActionController state
        isBusy={controller.isBusy}
        busyLabel={controller.busyLabel}
        actionPhase={controller.phase}
      />
      
      {/* Paywall Modal */}
      {PaywallModalComponent}
      
      {/* ⚡ NEW: Credit Confirmation Modal (controlled by ActionController) */}
      {(controller.phase === 'awaiting_confirmation' || controller.phase === 'running_confirmed') && controller.state.confirmationPayload && (
        <CreditConfirmationModal
          open={true}
          onOpenChange={(open) => {
            // Allow close only if awaiting_confirmation (not during running_confirmed)
            if (!open && controller.phase === 'awaiting_confirmation') {
              controller.reset();
            }
          }}
          creditCode={controller.state.confirmationPayload.creditCode as any}
          eventId={controller.state.confirmationPayload.eventId || ''}
          requestedParticipants={controller.state.confirmationPayload.requestedParticipants || 0}
          onConfirm={handleConfirmCredit}
          onCancel={() => controller.reset()}
          isLoading={controller.phase === 'running_confirmed'}
        />
      )}
    </div>
  );
}

