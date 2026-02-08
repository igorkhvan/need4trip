/**
 * Edit Event Page Client Component
 * 
 * SSOT_UI_STRUCTURE — EDIT page renders without server-side blocking
 * SSOT_UI_ASYNC_PATTERNS — temporary disabled form while data loads
 * 
 * Архитектура:
 * - Форма рендерится СРАЗУ (optimistic UI)
 * - Данные (event, clubs, plan limits) загружаются асинхронно после mount
 * - useAuth() предоставляет user из SSR (мгновенно)
 * - Поля disabled пока event data загружается
 * 
 * ⚡ Uses ActionController for race-condition-free async operations
 * SSOT: docs/ssot/SSOT_ARCHITECTURE.md § ActionController Standard
 * 
 * B5.1: Integrated with useHandleApiError() for 402/409 handling
 * SSOT: docs/phase/b5/PHASE_B5-0_UI_FOUNDATION_IMPLEMENTATION.md
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { EventForm } from "@/components/events/event-form";
import { useHandleApiError } from "@/components/billing/BillingModalHost";
import { useBillingModalState } from "@/lib/billing/ui/BillingModalContext";
import { ClientError } from "@/lib/types/errors";
import { useAuth } from "@/components/auth/auth-provider";
import { useActionController } from "@/lib/ui/actionController";
import { useClubPlan, type ClubPlanLimits } from "@/hooks/use-club-plan";
import type { Event } from "@/lib/types/event";

// Type for manageable clubs
interface ManageableClub {
  id: string;
  name: string;
  userRole: "owner" | "admin";
}

interface EditEventPageClientProps {
  eventId: string;
}

/**
 * EditEventPageClient - Main component with billing modal support
 * 
 * B5.1: Uses useHandleApiError() for 402/409 handling via B5.0 infrastructure
 * B5.D1: BillingModalHost now provided globally via root layout
 */
export function EditEventPageClient({ eventId }: EditEventPageClientProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  // ⚡ ActionController for race-condition-free operations
  const controller = useActionController<{
    payload: Record<string, unknown>;
  }>();
  
  // Track billing modal state — disable form while modal is open
  const billingState = useBillingModalState();
  const isBillingModalOpen = billingState?.modalType != null;
  
  // B5.1: Store last submitted payload for credit confirmation retry
  const lastSubmitPayloadRef = useRef<Record<string, unknown> | null>(null);
  
  // SSOT_UI_ASYNC_PATTERNS — client-side data loading states
  const [event, setEvent] = useState<Event | null>(null);
  const [isEventLoading, setIsEventLoading] = useState(true);
  const [eventError, setEventError] = useState<string | null>(null);
  
  const [manageableClubs, setManageableClubs] = useState<ManageableClub[]>([]);
  const [clubsLoading, setClubsLoading] = useState(true);
  
  // Plan limits hook - depends on loaded event's clubId
  const { limits: clubPlanLimits, loading: planLoading } = useClubPlan(event?.clubId ?? null);
  
  // B5.1: Submit with optional confirm_credit flag
  const submitEvent = useCallback(async (
    payload: Record<string, unknown>,
    options?: { confirmCredit?: boolean }
  ) => {
    const url = options?.confirmCredit 
      ? `/api/events/${eventId}?confirm_credit=1` 
      : `/api/events/${eventId}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    // Add Idempotency-Key header (prevents duplicates)
    if (controller.correlationId) {
      headers["Idempotency-Key"] = controller.correlationId;
    }
    
    const res = await fetch(url, {
      method: "PUT",
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
    controller.setRedirecting();
    router.push(`/events/${eventId}`);
    router.refresh();
  }, [controller, router, eventId]);
  
  // B5.1: Initialize useHandleApiError with onConfirmCredit + onBetaContinue callbacks
  const { handleError } = useHandleApiError({
    clubId: event?.clubId ?? undefined,
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
  
  // Load event data client-side
  useEffect(() => {
    let mounted = true;
    
    const loadEvent = async () => {
      setIsEventLoading(true);
      setEventError(null);
      
      try {
        const res = await fetch(`/api/events/${eventId}`, {
          credentials: "include",
        });
        
        if (!mounted) return;
        
        if (res.status === 404) {
          // Event not found - redirect to events list
          router.replace("/events");
          return;
        }
        
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error?.message || `Failed to load event: ${res.status}`);
        }
        
        const json = await res.json();
        const loadedEvent = json.event || json.data?.event;
        
        if (!loadedEvent) {
          throw new Error("Event data not found in response");
        }
        
        setEvent(loadedEvent);
      } catch (err) {
        console.error("[EditEvent] Failed to load event:", err);
        if (mounted) {
          setEventError(err instanceof Error ? err.message : "Не удалось загрузить событие");
        }
      } finally {
        if (mounted) {
          setIsEventLoading(false);
        }
      }
    };
    
    loadEvent();
    
    return () => {
      mounted = false;
    };
  }, [eventId, router]);
  
  // Load user's manageable clubs client-side (same as CREATE)
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
        console.error("[EditEvent] Failed to load clubs:", err);
      } finally {
        if (mounted) setClubsLoading(false);
      }
    };
    
    loadClubs();
    
    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);
  
  // Check ownership and redirect if not owner
  useEffect(() => {
    // Wait for both auth and event to load
    if (authLoading || isEventLoading) return;
    
    // Not authenticated - redirect to event page (auth modal will show there)
    if (!isAuthenticated || !user) {
      router.replace(`/events/${eventId}`);
      return;
    }
    
    // Event loaded - check ownership
    if (event) {
      const isOwner = user.id === event.createdByUserId;
      
      if (!isOwner) {
        // Not owner - redirect to event detail page
        router.replace(`/events/${eventId}`);
      }
    }
  }, [authLoading, isEventLoading, isAuthenticated, user, event, eventId, router]);
  
  // Compute derived values
  const isOwner = user?.id === event?.createdByUserId;
  const hasParticipants = (event?.participantsCount ?? 0) > 0;
  
  // Plan limits: use loaded club plan or free defaults
  const basePlanLimits: ClubPlanLimits = clubPlanLimits ?? {
    maxMembers: null,
    maxEventParticipants: 15, // LAST_RESORT_FALLBACK: used only when DB unavailable
    allowPaidEvents: false,
    allowCsvExport: false,
  };
  
  // For edit mode: use effective entitlements from API (accounts for consumed credits)
  // This fixes "Ваш лимит: 15" for upgraded events (should show upgrade limit)
  const effectivePlanLimits: ClubPlanLimits = event?.effectiveMaxParticipants
    ? {
        ...basePlanLimits,
        maxEventParticipants: event.effectiveMaxParticipants,
      }
    : basePlanLimits;
  
  // Form is disabled while event data is loading
  const isFormDisabled = isEventLoading || !event || !isOwner;
  
  const handleSubmit = async (payload: Record<string, unknown>) => {
    // B5.1: Store payload for potential credit confirmation retry
    lastSubmitPayloadRef.current = payload;
    
    await controller.start("save_changes", async () => {
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
  
  // Show nothing while auth check happens (same as CREATE)
  if (!isAuthenticated && !authLoading) {
    return null; // Will redirect to event page
  }
  
  // Show error if event failed to load (after loading completes)
  if (!isEventLoading && eventError) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">{eventError}</p>
        </div>
      </div>
    );
  }
  
  // Build initialValues from loaded event (or empty defaults while loading)
  const initialValues = event ? {
    title: event.title,
    description: event.description,
    categoryId: event.categoryId,
    dateTime: event.dateTime,
    cityId: event.cityId,
    locations: event.locations || [
      {
        sortOrder: 1,
        title: "Точка сбора",
        latitude: null,
        longitude: null,
        rawInput: null,
      },
    ],
    maxParticipants: event.maxParticipants,
    customFieldsSchema: event.customFieldsSchema || [],
    visibility: event.visibility,
    vehicleTypeRequirement: event.vehicleTypeRequirement,
    allowedBrandIds: event.allowedBrands?.map((b) => b.id) ?? [],
    rules: event.rules ?? "",
    clubId: event.clubId ?? null,
    clubName: event.club?.name,
    isPaid: event.isPaid,
    price: event.price ? String(event.price) : "",
    currencyCode: event.currencyCode ?? null,
    allowAnonymousRegistration: event.allowAnonymousRegistration,
  } : undefined;
  
  return (
    <div className="space-y-6">
      {/* SSOT_UI_STRUCTURE — Form renders immediately
          SSOT_UI_ASYNC_PATTERNS — temporary disabled form while data loads
          Key forces remount when event data arrives (populates initialValues) */}
      <EventForm
        key={event ? `event-${event.id}` : "loading"}
        mode="edit"
        backHref={event ? `/events/${event.id}` : "/events"}
        submitLabel="Сохранить изменения"
        headerTitle="Редактирование события"
        headerDescription="Обновите параметры события. Изменения сразу будут видны участникам."
        manageableClubs={manageableClubs}
        planLimits={effectivePlanLimits}
        lockedFieldIds={
          hasParticipants && event?.customFieldsSchema
            ? event.customFieldsSchema.map((f) => f.id).filter(Boolean)
            : []
        }
        disabled={isFormDisabled}
        initialValues={initialValues}
        onSubmit={handleSubmit}
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
