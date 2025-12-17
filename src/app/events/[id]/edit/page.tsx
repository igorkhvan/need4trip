"use client";

export const dynamic = "force-dynamic";

import { notFound, useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamicImport from "next/dynamic";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { handleApiError } from "@/lib/utils/errors";
import { VehicleTypeRequirement, Visibility } from "@/lib/types/event";
import { EventCategoryDto } from "@/lib/types/eventCategory";
import { PaywallModal } from "@/components/billing/paywall-modal";

// Динамический импорт формы события для code splitting
const EventForm = dynamicImport(
  () => import("@/components/events/event-form").then((mod) => ({ default: mod.EventForm })),
  { ssr: false }
);

type Event = {
  id: string;
  title: string;
  description: string;
  categoryId: string | null; // FK to event_categories
  category?: EventCategoryDto | null; // Hydrated category
  dateTime: string;
  cityId?: string | null; // FK на cities table (normalized)
  locationText: string;
  maxParticipants: number | null;
  customFieldsSchema: any[];
  visibility: Visibility;
  vehicleTypeRequirement: VehicleTypeRequirement;
  allowedBrands: { id: string; name: string }[];
  rules?: string | null;
  isClubEvent: boolean;
  isPaid: boolean;
  price?: number | null;
  currencyCode?: string | null; // ISO 4217 code (normalized)
  createdByUserId: string | null;
};

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [event, setEvent] = useState<Event | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallData, setPaywallData] = useState<{
    message: string;
    requiredPlanId?: string;
  } | null>(null);

  useEffect(() => {
    async function loadEvent() {
      try {
        console.log("🔍 Loading event:", id);
        
        // Fetch current user
        const userRes = await fetch("/api/auth/me");
        const userData = userRes.ok ? await userRes.json() : null;
        setCurrentUserId(userData?.user?.id ?? null);
        console.log("👤 Current user:", userData?.user?.id ?? "guest");

        // Fetch event
        const eventRes = await fetch(`/api/events/${id}`);
        console.log("📡 Event response status:", eventRes.status);
        
        if (!eventRes.ok) {
          const errorBody = await eventRes.text();
          console.error("❌ Event fetch failed:", eventRes.status, errorBody);
          throw new Error(`Event not found: ${eventRes.status}`);
        }
        
        const eventResponse = await eventRes.json();
        // API returns: {success: true, data: {event: {...}}}
        const eventData = eventResponse.data || eventResponse;
        
        // Fetch participants
        const participantsRes = await fetch(`/api/events/${id}/participants`);
        const participantsResponse = participantsRes.ok ? await participantsRes.json() : { participants: [] };
        const participantsData = participantsResponse.data || participantsResponse;
        
        setEvent(eventData.event);
        setParticipantCount(participantsData.participants?.length ?? 0);
      } catch (err) {
        console.error("💥 Load event error:", err);
        setError(err instanceof Error ? err.message : "Failed to load event");
      } finally {
        setLoading(false);
      }
    }
    loadEvent();
  }, [id]);

  if (loading) {
    return (
      <div className="page-container space-y-6 pb-10 pt-12">
        {/* Back Button Skeleton */}
        <div className="h-12 w-32 animate-pulse rounded-lg bg-[#F7F7F8]" />
        
        {/* Header Skeleton */}
        <div className="space-y-3">
          <div className="h-12 w-96 animate-pulse rounded-lg bg-[#F7F7F8]" />
          <div className="h-6 w-full max-w-2xl animate-pulse rounded-lg bg-[#F7F7F8]" />
        </div>

        {/* Form Cards Skeleton */}
        <div className="space-y-5">
          {[1, 2, 3, 4].map((cardNum) => (
            <div key={cardNum} className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
              {/* Card Header */}
              <div className="mb-6 flex items-center gap-3">
                <div className="h-8 w-8 animate-pulse rounded-full bg-[#FF6F2C]/20" />
                <div className="h-7 w-64 animate-pulse rounded bg-[#F7F7F8]" />
              </div>
              
              {/* Card Fields */}
              <div className="space-y-4">
                {[1, 2].map((fieldNum) => (
                  <div key={fieldNum} className="space-y-2">
                    <div className="h-5 w-32 animate-pulse rounded bg-[#F7F7F8]" />
                    <div className="h-12 w-full animate-pulse rounded-xl bg-[#F7F7F8]" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Centered Spinner */}
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-base text-[#6B7280]">Загрузка данных события...</p>
          </div>
        </div>
      </div>
    );
  }
  if (error || !event) {
    console.error("🚫 Returning notFound:", { error, hasEvent: !!event });
    return notFound();
  }

  const isOwner = currentUserId === event.createdByUserId;
  const hasParticipants = participantCount > 0;
  const authMissing = !currentUserId;

  const handleSubmit = async (payload: Record<string, unknown>) => {
    if (!isOwner || authMissing) {
      throw new Error("Недостаточно прав / войдите через Telegram");
    }
    
    const res = await fetch(`/api/events/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      // Handle paywall error (402) - show modal and throw special error
      if (res.status === 402) {
        try {
          const errorData = await res.json();
          const error = errorData.error || errorData;
          
          const paywallInfo = {
            message: error.message || "Эта функция доступна на платных тарифах",
            requiredPlanId: error.details?.requiredPlanId || error.requiredPlanId,
          };
          
          setPaywallData(paywallInfo);
          setPaywallOpen(true);
          
          // Throw special error that EventForm will recognize and ignore
          const paywallError = new Error("PAYWALL_SHOWN");
          (paywallError as any).isPaywall = true;
          throw paywallError;
        } catch (e: any) {
          // If it's already our paywall error, re-throw it
          if (e.isPaywall) throw e;
          
          // If parsing fails, show generic paywall
          setPaywallData({
            message: "Эта функция доступна на платных тарифах",
          });
          setPaywallOpen(true);
          
          const paywallError = new Error("PAYWALL_SHOWN");
          (paywallError as any).isPaywall = true;
          throw paywallError;
        }
      }
      
      await handleApiError(res);
      return; // Stop here if error
    }
    
    // Success - redirect to event detail page with force refresh
    router.push(`/events/${id}`);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {authMissing && (
        <div className="page-container">
          <Alert>
            <AlertTitle>Требуется авторизация</AlertTitle>
            <AlertDescription>
              Войдите через Telegram, чтобы редактировать событие.
            </AlertDescription>
          </Alert>
        </div>
      )}
      {!isOwner && !authMissing && (
        <div className="page-container">
          <Alert variant="destructive">
            <AlertTitle>Нет прав</AlertTitle>
            <AlertDescription>
              Только владелец может редактировать это событие.
            </AlertDescription>
          </Alert>
        </div>
      )}
      <EventForm
        mode="edit"
        backHref={`/events/${id}`}
        submitLabel="Сохранить изменения"
        headerTitle="Редактирование события"
        headerDescription="Обновите параметры события. Изменения сразу будут видны участникам."
        lockedFieldIds={
          hasParticipants && event.customFieldsSchema 
            ? event.customFieldsSchema.map((f: any) => f.id).filter((id: string) => id)
            : []
        }
        disabled={authMissing || !isOwner}
        initialValues={{
          title: event.title,
          description: event.description,
          categoryId: event.categoryId,
          dateTime: event.dateTime,
          cityId: event.cityId ?? null,
          locationText: event.locationText,
          maxParticipants: event.maxParticipants,
          customFieldsSchema: event.customFieldsSchema || [],
          visibility: event.visibility,
          vehicleTypeRequirement: event.vehicleTypeRequirement,
          allowedBrandIds: event.allowedBrands.map((b) => b.id),
          rules: event.rules ?? "",
          isClubEvent: event.isClubEvent,
          isPaid: event.isPaid,
          price: event.price ? String(event.price) : "",
          currencyCode: event.currencyCode ?? null,
        }}
        onSubmit={handleSubmit}
      />
      
      {paywallData && (
        <PaywallModal
          isOpen={paywallOpen}
          onClose={() => setPaywallOpen(false)}
          message={paywallData.message}
          requiredPlanId={paywallData.requiredPlanId}
        />
      )}
    </div>
  );
}
