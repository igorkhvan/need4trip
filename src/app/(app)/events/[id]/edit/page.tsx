/**
 * Edit Event Page (Server Component)
 * 
 * Архитектура:
 * - Server: загружает event + user + plan limits
 * - Client: рендерит форму с готовыми данными
 * 
 * Паттерн: как EventDetails page (SSR → Client Component)
 */

import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getEventWithVisibility, hydrateEvent } from "@/lib/services/events";
import { getPlanById } from "@/lib/db/planRepo";
import { getClubCurrentPlan } from "@/lib/services/accessControl";
import { EditEventPageClient } from "./edit-event-client";
import type { ClubPlanLimits } from "@/hooks/use-club-plan";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEventPage({ params }: PageProps) {
  const { id } = await params;
  
  // 1. Load user (required for ownership check)
  const currentUser = await getCurrentUser();
  
  if (!currentUser) {
    // Redirect to event page, where auth modal will trigger
    redirect(`/events/${id}`);
  }
  
  // 2. Load event with visibility check
  const event = await getEventWithVisibility(id, {
    currentUser,
    enforceVisibility: true,
  }).catch(() => null);
  
  if (!event) {
    return notFound();
  }
  
  // 3. Check ownership
  const isOwner = currentUser.id === event.createdByUserId;
  
  if (!isOwner) {
    // Not owner - redirect to event detail page
    redirect(`/events/${id}`);
  }
  
  // 4. Hydrate event (load related data)
  const hydratedEvent = await hydrateEvent(event);
  
  // 5. Load plan limits based on event type
  let planLimits: ClubPlanLimits;
  
  if (event.clubId) {
    // Club event → load club plan
    const { plan } = await getClubCurrentPlan(event.clubId);
    planLimits = {
      maxMembers: plan.maxMembers,
      maxEventParticipants: plan.maxEventParticipants,
      allowPaidEvents: plan.allowPaidEvents,
      allowCsvExport: plan.allowCsvExport,
    };
  } else {
    // Regular event → load FREE plan
    const freePlan = await getPlanById("free");
    planLimits = {
      maxMembers: freePlan.maxMembers,
      maxEventParticipants: freePlan.maxEventParticipants,
      allowPaidEvents: freePlan.allowPaidEvents,
      allowCsvExport: freePlan.allowCsvExport,
    };
  }
  
  // 6. Render client component with all data ready
  return (
    <EditEventPageClient
      event={hydratedEvent}
      planLimits={planLimits}
      currentUserId={currentUser.id}
    />
  );
}
