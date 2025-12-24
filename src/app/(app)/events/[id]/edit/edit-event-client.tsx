/**
 * Edit Event Page Client Component
 * 
 * Получает готовые данные от серверного компонента:
 * - event (hydrated with all relations)
 * - planLimits (from club plan or FREE plan)
 * - currentUserId (for ownership check)
 */

"use client";

import { useRouter } from "next/navigation";
import { EventForm } from "@/components/events/event-form";
import { usePaywall } from "@/components/billing/PaywallModal";
import { handleApiError } from "@/lib/utils/errors";
import type { ClubPlanLimits } from "@/hooks/use-club-plan";
import type { HydratedEvent } from "@/lib/services/events";

interface EditEventPageClientProps {
  event: HydratedEvent;
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
  
  const isOwner = currentUserId === event.createdByUserId;
  const hasParticipants = (event.participantsCount ?? 0) > 0;
  
  const handleSubmit = async (payload: Record<string, unknown>) => {
    const res = await fetch(`/api/events/${event.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      // Handle paywall error (402)
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
    
    // Success - redirect to event detail page
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
    </div>
  );
}

