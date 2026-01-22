/**
 * Create Event Page Client Component
 * 
 * SSOT_UI_STRUCTURE — CREATE page renders without server-side blocking
 * SSOT_UI_ASYNC_PATTERNS — optimistic client-side data loading
 * 
 * Архитектура:
 * - Форма рендерится СРАЗУ (optimistic UI)
 * - Данные (clubs, plan limits) загружаются асинхронно после mount
 * - useAuth() предоставляет user из SSR (мгновенно)
 * 
 * SSOT §4: Implements checkbox + single dropdown for club selection
 * 
 * ⚡ Uses ActionController for race-condition-free async operations
 * SSOT: docs/ssot/SSOT_ARCHITECTURE.md § ActionController Standard
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ClientError } from "@/lib/types/errors";
import { useProtectedAction } from "@/lib/hooks/use-protected-action";
import { usePaywall } from "@/components/billing/paywall-modal";
import { CreditConfirmationModal } from "@/components/billing/credit-confirmation-modal";
import { useAuth } from "@/components/auth/auth-provider";
import { useActionController } from "@/lib/ui/actionController";
import { useClubPlan, type ClubPlanLimits } from "@/hooks/use-club-plan";
import type { CreditCode } from "@/lib/types/billing";

// SSOT_UI_STRUCTURE — CREATE form renders immediately (optimistic UI)
// SSOT_UI_ASYNC_PATTERNS — reference data loads inline, non-blocking
// Static import for CREATE flow: form renders instantly, no skeleton
import { EventForm } from "@/components/events/event-form";

// Type for manageable clubs
interface ManageableClub {
  id: string;
  name: string;
  userRole: "owner" | "admin";
}

export function CreateEventPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { showPaywall, PaywallModalComponent } = usePaywall();
  const { execute } = useProtectedAction(isAuthenticated);
  
  // SSOT_UI_ASYNC_PATTERNS — client-side data loading for clubs
  const [manageableClubs, setManageableClubs] = useState<ManageableClub[]>([]);
  const [clubsLoading, setClubsLoading] = useState(true);
  
  // Get legacy clubId from URL params (backward compat)
  const legacyClubId = searchParams.get("clubId") ?? null;
  
  // Get user's city from auth context (SSR hydrated)
  const userCityId = user?.cityId ?? null;
  
  // SSOT_UI_ASYNC_PATTERNS — Free plan limits from hook (with fallback)
  const { limits: freePlanLimits, loading: planLoading } = useClubPlan(null);
  
  // Default plan limits (optimistic fallback while loading)
  const defaultPlanLimits: ClubPlanLimits = freePlanLimits ?? {
    maxMembers: null,
    maxEventParticipants: 15, // Safe fallback
    allowPaidEvents: false,
    allowCsvExport: false,
  };
  
  // Load user's manageable clubs client-side
  useEffect(() => {
    if (!isAuthenticated) {
      setClubsLoading(false);
      return;
    }
    
    let mounted = true;
    
    const loadClubs = async () => {
      try {
        const res = await fetch("/api/profile", {
          credentials: "include",
        });
        
        if (!res.ok) {
          if (mounted) setClubsLoading(false);
          return;
        }
        
        const json = await res.json();
        const clubs = json.data?.clubs || json.clubs || [];
        
        if (!mounted) return;
        
        // Filter to only owner/admin clubs (SSOT §4.2)
        const manageable = clubs
          .filter((club: { userRole?: string }) => 
            club.userRole === "owner" || club.userRole === "admin"
          )
          .map((club: { id: string; name: string; userRole: string }) => ({
            id: club.id,
            name: club.name,
            userRole: club.userRole as "owner" | "admin",
          }));
        
        setManageableClubs(manageable);
      } catch (err) {
        console.error("[CreateEvent] Failed to load clubs:", err);
      } finally {
        if (mounted) setClubsLoading(false);
      }
    };
    
    loadClubs();
    
    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);
  
  // ⚡ NEW: ActionController for race-condition-free operations
  const controller = useActionController<{
    payload: Record<string, unknown>;
    creditCode?: CreditCode;
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
      
      // Parse JSON once for all cases
      const json = await res.json();
      
      // Handle 409 CREDIT_CONFIRMATION_REQUIRED
      if (res.status === 409) {
        const meta = json.error?.meta || json.error?.details?.meta;
        
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
        
        // Generic 409 error
        throw new ClientError(
          json.error?.message || "Conflict",
          json.error?.code || "CONFLICT",
          409,
          json.error?.details
        );
      }
      
      // Handle 402 PAYWALL
      if (res.status === 402) {
        const paywallError = json.error?.details || json.error;
        
        if (paywallError) {
          showPaywall(paywallError);
          return;
        }
      }
      
      // Handle other errors
      if (!res.ok) {
        throw new ClientError(
          json.error?.message || `Request failed with status ${res.status}`,
          json.error?.code || "REQUEST_FAILED",
          res.status,
          json.error?.details
        );
      }
      
      // ✅ Success - mark as redirecting BEFORE navigation
      const createdEvent = json.data?.event || json.event;
      
      controller.setRedirecting();
      
      if (createdEvent?.id) {
        router.push(`/events/${createdEvent.id}`);
      } else {
        console.error('[CreateEvent] No event.id in response:', json);
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
      
      // Parse JSON once
      const json = await res.json();
      
      // Handle 402 PAYWALL (fallback if credit was consumed by another request)
      if (res.status === 402) {
        const paywallError = json.error?.details || json.error;
        
        if (paywallError) {
          showPaywall(paywallError);
          throw new Error('Paywall required');
        }
      }
      
      // Handle other errors
      if (!res.ok) {
        throw new ClientError(
          json.error?.message || `Request failed with status ${res.status}`,
          json.error?.code || "REQUEST_FAILED",
          res.status,
          json.error?.details
        );
      }
      
      // ✅ Success - mark as redirecting BEFORE navigation
      const createdEvent = json.data?.event || json.event;
      
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
        externalError={controller.state.lastError}
      />
      
      {/* Paywall Modal */}
      {PaywallModalComponent}
      
      {/* ⚡ NEW: Credit Confirmation Modal (controlled by ActionController) */}
      {(controller.phase === 'awaiting_confirmation' 
        || controller.phase === 'running_confirmed'
        || controller.phase === 'redirecting') 
        && controller.state.confirmationPayload && (
        <CreditConfirmationModal
          open={true}
          onOpenChange={(open) => {
            // Allow close only if awaiting_confirmation (not during running_confirmed or redirecting)
            if (!open && controller.phase === 'awaiting_confirmation') {
              controller.reset();
            }
          }}
          creditCode={controller.state.confirmationPayload.creditCode as CreditCode}
          eventId={controller.state.confirmationPayload.eventId || ''}
          requestedParticipants={controller.state.confirmationPayload.requestedParticipants || 0}
          onConfirm={handleConfirmCredit}
          onCancel={() => controller.reset()}
          isLoading={controller.phase === 'running_confirmed' || controller.phase === 'redirecting'}
        />
      )}
    </div>
  );
}

