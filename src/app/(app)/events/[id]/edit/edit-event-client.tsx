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
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EventForm } from "@/components/events/event-form";
import { usePaywall } from "@/components/billing/paywall-modal";
import { CreditConfirmationModal } from "@/components/billing/credit-confirmation-modal";
import { ClientError } from "@/lib/types/errors";
import { useAuth } from "@/components/auth/auth-provider";
import { useActionController } from "@/lib/ui/actionController";
import { useClubPlan, type ClubPlanLimits } from "@/hooks/use-club-plan";
import type { Event } from "@/lib/types/event";
import type { CreditCode } from "@/lib/types/billing";

// Type for manageable clubs
interface ManageableClub {
  id: string;
  name: string;
  userRole: "owner" | "admin";
}

interface EditEventPageClientProps {
  eventId: string;
}

export function EditEventPageClient({ eventId }: EditEventPageClientProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  // ⚡ ActionController for race-condition-free operations
  const controller = useActionController<{
    payload: Record<string, unknown>;
    creditCode?: CreditCode;
    eventId?: string;
    requestedParticipants?: number;
  }>();
  
  // SSOT_ARCHITECTURE §15: Paywall close without completion = implicit abort
  // Must reset pending/disabled UI state (no error copy)
  const { showPaywall, PaywallModalComponent } = usePaywall({
    onAbort: () => controller.reset(),
  });
  
  // SSOT_UI_ASYNC_PATTERNS — client-side data loading states
  const [event, setEvent] = useState<Event | null>(null);
  const [isEventLoading, setIsEventLoading] = useState(true);
  const [eventError, setEventError] = useState<string | null>(null);
  
  const [manageableClubs, setManageableClubs] = useState<ManageableClub[]>([]);
  const [clubsLoading, setClubsLoading] = useState(true);
  
  // Plan limits hook - depends on loaded event's clubId
  const { limits: clubPlanLimits, loading: planLoading } = useClubPlan(event?.clubId ?? null);
  
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
  const defaultPlanLimits: ClubPlanLimits = clubPlanLimits ?? {
    maxMembers: null,
    maxEventParticipants: 15, // Safe fallback
    allowPaidEvents: false,
    allowCsvExport: false,
  };
  
  // Form is disabled while event data is loading
  const isFormDisabled = isEventLoading || !event || !isOwner;
  
  const handleSubmit = async (payload: Record<string, unknown>) => {
    await controller.start("save_changes", async () => {
      // Build request URL and headers
      const url = `/api/events/${eventId}`;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      
      // ⚡ Add Idempotency-Key header (prevents duplicates)
      if (controller.correlationId) {
        headers["Idempotency-Key"] = controller.correlationId;
      }
      
      const res = await fetch(url, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });
      
      // Parse JSON once
      const json = await res.json();
      
      // Handle 409 CREDIT_CONFIRMATION_REQUIRED
      if (res.status === 409) {
        const meta = json.error?.meta || json.error?.details?.meta;
        
        if (meta) {
          // Store payload in controller and await confirmation
          controller.awaitConfirmation({
            payload,
            creditCode: meta.creditCode,
            eventId: meta.eventId,
            requestedParticipants: meta.requestedParticipants,
          });
          return;
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
      controller.setRedirecting();
      router.push(`/events/${eventId}`);
      router.refresh();
    });
  };
  
  // Handle credit confirmation
  const handleConfirmCredit = async () => {
    await controller.confirm(async (stored) => {
      const { payload } = stored;
      
      // Build confirmed request
      const url = `/api/events/${eventId}?confirm_credit=1`;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      
      // ⚡ CRITICAL: Reuse SAME Idempotency-Key for retry
      if (controller.correlationId) {
        headers["Idempotency-Key"] = controller.correlationId;
      }
      
      const res = await fetch(url, {
        method: "PUT",
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
      controller.setRedirecting();
      router.push(`/events/${eventId}`);
      router.refresh();
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
        planLimits={defaultPlanLimits}
        lockedFieldIds={
          hasParticipants && event?.customFieldsSchema
            ? event.customFieldsSchema.map((f) => f.id).filter(Boolean)
            : []
        }
        disabled={isFormDisabled}
        initialValues={initialValues}
        onSubmit={handleSubmit}
        // ⚡ Pass ActionController state
        isBusy={controller.isBusy}
        busyLabel={controller.busyLabel}
        actionPhase={controller.phase}
        externalError={controller.state.lastError}
      />
      
      {/* Paywall Modal */}
      {PaywallModalComponent}
      
      {/* Credit Confirmation Modal (controlled by ActionController) */}
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
          eventId={controller.state.confirmationPayload.eventId || eventId}
          requestedParticipants={controller.state.confirmationPayload.requestedParticipants || 0}
          onConfirm={handleConfirmCredit}
          onCancel={() => controller.reset()}
          isLoading={controller.phase === 'running_confirmed' || controller.phase === 'redirecting'}
        />
      )}
    </div>
  );
}
