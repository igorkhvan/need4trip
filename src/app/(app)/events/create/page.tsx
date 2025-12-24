/**
 * Create Event Page (Server Component)
 * 
 * Архитектура:
 * - Server: загружает user + club (если clubId) + plan limits
 * - Client: рендерит форму с готовыми данными
 */

import { getCurrentUser } from "@/lib/auth/currentUser";
import { getPlanById } from "@/lib/db/planRepo";
import { getClubCurrentPlan } from "@/lib/services/accessControl";
import { getClub } from "@/lib/services/clubs";
import { CreateEventPageClient } from "./create-event-client";
import type { ClubPlanLimits } from "@/hooks/use-club-plan";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ clubId?: string }>;
}

export default async function CreateEventPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const clubId = params.clubId;
  
  // 1. Load current user
  const currentUser = await getCurrentUser();
  
  // 2. Load club if clubId is provided
  let club = null;
  let planLimits: ClubPlanLimits;
  
  if (clubId && currentUser) {
    // Load club
    club = await getClub(clubId).catch(() => null);
    
    if (club) {
      // Load club plan limits
      const { plan } = await getClubCurrentPlan(clubId);
      planLimits = {
        maxMembers: plan.maxMembers,
        maxEventParticipants: plan.maxEventParticipants,
        allowPaidEvents: plan.allowPaidEvents,
        allowCsvExport: plan.allowCsvExport,
      };
    } else {
      // Club not found, use FREE plan
      const freePlan = await getPlanById("free");
      planLimits = {
        maxMembers: freePlan.maxMembers,
        maxEventParticipants: freePlan.maxEventParticipants,
        allowPaidEvents: freePlan.allowPaidEvents,
        allowCsvExport: freePlan.allowCsvExport,
      };
    }
  } else {
    // No club, use FREE plan
    const freePlan = await getPlanById("free");
    planLimits = {
      maxMembers: freePlan.maxMembers,
      maxEventParticipants: freePlan.maxEventParticipants,
      allowPaidEvents: freePlan.allowPaidEvents,
      allowCsvExport: freePlan.allowCsvExport,
    };
  }
  
  return (
    <CreateEventPageClient
      isAuthenticated={!!currentUser}
      userCityId={currentUser?.cityId ?? null}
      club={club}
      planLimits={planLimits}
      clubId={clubId ?? null}
    />
  );
}
