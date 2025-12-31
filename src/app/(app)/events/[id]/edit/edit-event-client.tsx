/**
 * Edit Event Page Client Component
 * 
 * Получает готовые данные от серверного компонента:
 * - event (hydrated with all relations)
 * - planLimits (from club plan or effective entitlements for personal events)
 * - currentUserId (for ownership check)
 * 
 * ⚡ NEW: Uses ActionController for race-condition-free async operations
 * SSOT: docs/ssot/SSOT_ARCHITECTURE.md § ActionController Standard
 */

"use client";

import { useRouter } from "next/navigation";
import { EventForm } from "@/components/events/event-form";
import { usePaywall } from "@/components/billing/paywall-modal";
import { CreditConfirmationModal } from "@/components/billing/credit-confirmation-modal";
import { handleApiError } from "@/lib/utils/errors";
import { useActionController } from "@/lib/ui/actionController";
import type { ClubPlanLimits } from "@/hooks/use-club-plan";
import type { Event } from "@/lib/types/event";

interface EditEventPageClientProps {
  event: Event;
  planLimits: ClubPlanLimits;
  currentUserId: string;
  manageableClubs: Array<{
    id: string;
    name: string;
    userRole: "owner" | "admin";
  }>;
}

export function EditEventPageClient({
  event,
  planLimits,
  currentUserId,
  manageableClubs,
}: EditEventPageClientProps) {
  const router = useRouter();
  const { showPaywall, PaywallModalComponent } = usePaywall();
  
  // ⚡ NEW: ActionController for race-condition-free operations
  const controller = useActionController<{
    payload: Record<string, unknown>;
    creditCode?: string;
    eventId?: string;
    requestedParticipants?: number;
  }>();
  
  const isOwner = currentUserId === event.createdByUserId;
  const hasParticipants = (event.participantsCount ?? 0) > 0;
  
  const handleSubmit = async (payload: Record<string, unknown>) => {
    await controller.start("save_changes", async () => {
      // Build request URL and headers
      const url = `/api/events/${event.id}`;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      
      // ⚡ NEW: Add Idempotency-Key header (prevents duplicates)
      if (controller.correlationId) {
        headers["Idempotency-Key"] = controller.correlationId;
      }
      
      const res = await fetch(url, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });
      
      // Handle 409 CREDIT_CONFIRMATION_REQUIRED
      if (res.status === 409) {
        const error409 = await res.json();
        const meta = error409.error?.meta;
        
        if (meta) {
          // ⚡ NEW: Store payload in controller and await confirmation
          controller.awaitConfirmation({
            payload,
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
      
      // ✅ Success - mark as redirecting BEFORE navigation
      controller.setRedirecting();
      router.push(`/events/${event.id}`);
      router.refresh();
    });
  };
  
  // ⚡ NEW: Handle credit confirmation
  const handleConfirmCredit = async () => {
    await controller.confirm(async (stored) => {
      const { payload } = stored;
      
      // Build confirmed request
      const url = `/api/events/${event.id}?confirm_credit=1`;
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
      controller.setRedirecting();
      router.push(`/events/${event.id}`);
      router.refresh();
    });
  };
  
  return (
    <div className="space-y-6">
      <EventForm
        mode="edit"
        backHref={`/events/${event.id}`}
        submitLabel="Сохранить изменения"
        headerTitle="Редактирование события"
        headerDescription="Обновите параметры события. Изменения сразу будут видны участникам."
        manageableClubs={manageableClubs}
        planLimits={planLimits}
        lockedFieldIds={
          hasParticipants && event.customFieldsSchema
            ? event.customFieldsSchema.map((f) => f.id).filter(Boolean)
            : []
        }
        disabled={!isOwner}
        initialValues={{
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
          clubId: event.clubId ?? null, // clubId instead of isClubEvent
          clubName: event.club?.name, // Club name for read-only display
          isPaid: event.isPaid,
          price: event.price ? String(event.price) : "",
          currencyCode: event.currencyCode ?? null,
          allowAnonymousRegistration: event.allowAnonymousRegistration,
        }}
        onSubmit={handleSubmit}
        // ⚡ NEW: Pass ActionController state
        isBusy={controller.isBusy}
        busyLabel={controller.busyLabel}
        actionPhase={controller.phase}
      />
      
      {/* Paywall Modal */}
      {PaywallModalComponent}
      
      {/* ⚡ NEW: Credit Confirmation Modal (controlled by ActionController) */}
      {controller.phase === 'awaiting_confirmation' && controller.state.confirmationPayload && (
        <CreditConfirmationModal
          open={true}
          onOpenChange={() => {
            // Allow close only if not running_confirmed
            if (controller.phase === 'awaiting_confirmation') {
              controller.reset();
            }
          }}
          creditCode={controller.state.confirmationPayload.creditCode as any}
          eventId={controller.state.confirmationPayload.eventId || event.id}
          requestedParticipants={controller.state.confirmationPayload.requestedParticipants || 0}
          onConfirm={handleConfirmCredit}
          onCancel={() => controller.reset()}
          isLoading={controller.phase === 'running_confirmed'}
        />
      )}
    </div>
  );
}

