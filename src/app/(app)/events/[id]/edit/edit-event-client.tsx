/**
 * Edit Event Page Client Component
 * 
 * Получает готовые данные от серверного компонента:
 * - event (hydrated with all relations)
 * - planLimits (from club plan or FREE plan)
 * - currentUserId (for ownership check)
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EventForm } from "@/components/events/event-form";
import { usePaywall } from "@/components/billing/paywall-modal";
import { useCreditConfirmation, CreditConfirmationModal } from "@/components/billing/credit-confirmation-modal";
import { handleApiError } from "@/lib/utils/errors";
import type { ClubPlanLimits } from "@/hooks/use-club-plan";
import type { Event } from "@/lib/types/event";

interface EditEventPageClientProps {
  event: Event;
  planLimits: ClubPlanLimits;
  currentUserId: string;
}

export function EditEventPageClient({
  event,
  planLimits,
  currentUserId,
}: EditEventPageClientProps) {
  const router = useRouter();
  const { showPaywall, PaywallModalComponent } = usePaywall();
  const { showConfirmation, hideConfirmation, modalState } = useCreditConfirmation();
  const [pendingEventId, setPendingEventId] = useState<string | null>(null);
  
  const isOwner = currentUserId === event.createdByUserId;
  const hasParticipants = (event.participantsCount ?? 0) > 0;
  
  const handlePublish = async (eventId: string, confirmCredit = false) => {
    const url = `/api/events/${eventId}/publish${confirmCredit ? '?confirm_credit=1' : ''}`;
    const publishRes = await fetch(url, {
      method: "POST",
    });
    
    // Handle 409 CREDIT_CONFIRMATION_REQUIRED
    if (publishRes.status === 409) {
      const error409 = await publishRes.json();
      const meta = error409.error?.meta;
      
      if (meta) {
        setPendingEventId(eventId);
        showConfirmation({
          creditCode: meta.creditCode,
          eventId: meta.eventId,
          requestedParticipants: meta.requestedParticipants,
        });
        return;
      }
    }
    
    // Handle 402 PAYWALL
    if (publishRes.status === 402) {
      const errorData = await publishRes.json();
      const paywallError = errorData.error?.details || errorData.error;
      
      if (paywallError) {
        showPaywall(paywallError);
        return;
      }
    }
    
    // Handle other errors
    if (!publishRes.ok) {
      await handleApiError(publishRes);
      return;
    }
    
    // Success - redirect to event detail
    router.push(`/events/${eventId}`);
    router.refresh();
  };

  const handleSubmit = async (payload: Record<string, unknown>) => {
    const res = await fetch(`/api/events/${event.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      // Handle paywall error (402) from update endpoint
      if (res.status === 402) {
        const errorData = await res.json();
        const paywallError = errorData.error?.details || errorData.error;
        
        if (paywallError) {
          showPaywall(paywallError);
          return;
        }
      }
      
      await handleApiError(res);
      return;
    }
    
    // Success - now call publish endpoint (will handle 402/409 there)
    // This ensures enforcement logic runs even after update
    await handlePublish(event.id);
  };
  
  return (
    <div className="space-y-6">
      <EventForm
        mode="edit"
        backHref={`/events/${event.id}`}
        submitLabel="Сохранить изменения"
        headerTitle="Редактирование события"
        headerDescription="Обновите параметры события. Изменения сразу будут видны участникам."
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
          isClubEvent: event.isClubEvent,
          isPaid: event.isPaid,
          price: event.price ? String(event.price) : "",
          currencyCode: event.currencyCode ?? null,
        }}
        onSubmit={handleSubmit}
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
            if (pendingEventId) {
              hideConfirmation();
              await handlePublish(pendingEventId, true);
            }
          }}
          onCancel={hideConfirmation}
        />
      )}
    </div>
  );
}

