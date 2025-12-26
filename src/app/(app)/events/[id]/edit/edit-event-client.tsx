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
  const [pendingPayload, setPendingPayload] = useState<Record<string, unknown> | null>(null);
  
  const isOwner = currentUserId === event.createdByUserId;
  const hasParticipants = (event.participantsCount ?? 0) > 0;
  
  const handleSubmit = async (payload: Record<string, unknown>, retryWithCredit = false) => {
    const url = retryWithCredit 
      ? `/api/events/${event.id}?confirm_credit=1` 
      : `/api/events/${event.id}`;
    
    const res = await fetch(url, {
      method: "PUT",
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
    
    // Success - redirect to event detail
    router.push(`/events/${event.id}`);
    router.refresh();
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

