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
 * 
 * B5.1: Integrated with useHandleApiError() for 402/409 handling
 * SSOT: docs/phase/b5/PHASE_B5-0_UI_FOUNDATION_IMPLEMENTATION.md
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ClientError } from "@/lib/types/errors";
import { useProtectedAction } from "@/lib/hooks/use-protected-action";
import { useHandleApiError } from "@/components/billing/BillingModalHost";
import { useBillingModalState } from "@/lib/billing/ui/BillingModalContext";
import { useAuth } from "@/components/auth/auth-provider";
import { useActionController } from "@/lib/ui/actionController";
import { useClubPlan, type ClubPlanLimits } from "@/hooks/use-club-plan";

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

/**
 * CreateEventPageClient - Main component with billing modal support
 * 
 * B5.1: Uses useHandleApiError() for 402/409 handling via B5.0 infrastructure
 * B5.D1: BillingModalHost now provided globally via root layout
 */
export function CreateEventPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { execute } = useProtectedAction(isAuthenticated);
  
  // ⚡ ActionController for race-condition-free operations
  const controller = useActionController<{
    payload: Record<string, unknown>;
  }>();
  
  // Track billing modal state — disable form while modal is open
  const billingState = useBillingModalState();
  const isBillingModalOpen = billingState?.modalType != null;
  
  // B5.1: Store last submitted payload for credit confirmation retry
  const lastSubmitPayloadRef = useRef<Record<string, unknown> | null>(null);
  
  // Get clubId from form state (updated on each submit)
  const currentClubIdRef = useRef<string | null>(null);
  
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
    maxEventParticipants: 15, // LAST_RESORT_FALLBACK: used only when DB unavailable
    allowPaidEvents: false,
    allowCsvExport: false,
  };
  
  // Load upgrade product limit for banner text (dynamic, not hardcoded)
  const [upgradeLimit, setUpgradeLimit] = useState<number | null>(null);
  useEffect(() => {
    let mounted = true;
    fetch("/api/billing/products")
      .then(res => res.ok ? res.json() : null)
      .then(json => {
        if (!mounted) return;
        // API returns { success: true, data: { products: [...] } }
        const products = json?.data?.products as Array<{ code: string; constraints?: Record<string, unknown> }> | undefined;
        const upgrade = products?.find(p => p.code === "EVENT_UPGRADE_500");
        if (upgrade?.constraints?.max_participants) {
          setUpgradeLimit(Number(upgrade.constraints.max_participants));
        }
      })
      .catch(() => { /* non-critical, banner will use fallback */ });
    return () => { mounted = false; };
  }, []);
  
  // B5.1: Submit with optional confirm_credit flag
  const submitEvent = useCallback(async (
    payload: Record<string, unknown>,
    options?: { confirmCredit?: boolean }
  ) => {
    const url = options?.confirmCredit ? "/api/events?confirm_credit=1" : "/api/events";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    // Add Idempotency-Key header (prevents duplicates)
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
    
    // B5.1: For 402/409, throw an error object that handleError() can process
    if (res.status === 402) {
      // Throw error with structure that isPaywallApiError() recognizes
      const errorObj = {
        status: 402,
        statusCode: 402,
        code: json.error?.code || "PAYWALL",
        error: json.error,
        details: json.error?.details,
        ...json.error?.details, // Spread for reason extraction
      };
      throw errorObj;
    }
    
    if (res.status === 409) {
      // DEFENSIVE: Club events should not get 409 CREDIT_CONFIRMATION
      const clubId = payload.clubId as string | null;
      if (clubId && json.error?.code === "CREDIT_CONFIRMATION_REQUIRED") {
        console.error("[BUG] Backend returned 409 for club event");
        throw new ClientError(
          "Ошибка биллинга. Клубные события не используют кредиты.",
          "BILLING_ERROR",
          500
        );
      }
      
      // Throw error with structure that isCreditConfirmationApiError() recognizes
      const errorObj = {
        status: 409,
        statusCode: 409,
        code: json.error?.code || "CREDIT_CONFIRMATION_REQUIRED",
        error: json.error,
        details: json.error?.details || json.error,
        ...(json.error?.details || json.error), // Spread for meta extraction
      };
      throw errorObj;
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
  }, [controller, router]);
  
  // B5.1: Initialize useHandleApiError with onConfirmCredit + onBetaContinue callbacks
  const { handleError } = useHandleApiError({
    clubId: currentClubIdRef.current ?? undefined,
    onConfirmCredit: async () => {
      // Re-submit with confirm_credit=1 using stored payload
      if (lastSubmitPayloadRef.current) {
        await submitEvent(lastSubmitPayloadRef.current, { confirmCredit: true });
      }
    },
    // SOFT_BETA_STRICT: resubmit after system auto-grant
    // UX Contract: UX_CONTRACT_PAYWALL_SOFT_BETA_STRICT.md §7.1
    onBetaContinue: async () => {
      if (lastSubmitPayloadRef.current) {
        await submitEvent(lastSubmitPayloadRef.current, { confirmCredit: true });
      }
    },
  });
  
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
    // B5.1: Store payload for potential credit confirmation retry
    lastSubmitPayloadRef.current = payload;
    currentClubIdRef.current = payload.clubId as string | null;
    
    await controller.start("create_event", async () => {
      try {
        await submitEvent(payload);
      } catch (err) {
        // B5.1: Use handleError for 402/409 handling
        const { handled } = handleError(err);
        
        if (!handled) {
          // Re-throw for controller to handle (existing behavior)
          throw err;
        }
        
        // If handled (402 or 409), modal is shown via global BillingModalHost
        // SSOT_ARCHITECTURE §15: Modal shown = action is pending, reset controller
        controller.reset();
      }
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
                Используйте для создания личного события до {upgradeLimit ?? 500} участников. Апгрейд может быть использован при публикации с вашим подтверждением.
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
        // Pass ActionController state + billing modal state
        isBusy={controller.isBusy || isBillingModalOpen}
        busyLabel={controller.busyLabel}
        actionPhase={controller.phase}
        externalError={controller.state.lastError}
      />
      
      {/* B5.D1: Modals rendered by global BillingModalHost in root layout */}
    </div>
  );
}

