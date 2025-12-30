/**
 * Create Event Page (Server Component)
 * 
 * Архитектура:
 * - Server: загружает user + user's manageable clubs + plan limits
 * - Client: рендерит форму с checkbox + dropdown (SSOT §4)
 */

import { getCurrentUser } from "@/lib/auth/currentUser";
import { getPlanById } from "@/lib/db/planRepo";
import { getClubCurrentPlan } from "@/lib/services/accessControl";
import { getUserClubs } from "@/lib/services/clubs";
import { CreateEventPageClient } from "./create-event-client";
import type { ClubPlanLimits } from "@/hooks/use-club-plan";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ clubId?: string }>;
}

export default async function CreateEventPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const legacyClubId = params.clubId; // Keep for backward compat, but UI will use dropdown
  
  // 1. Load current user
  const currentUser = await getCurrentUser();
  
  // 2. Load user's clubs where they can manage (owner/admin) - SSOT §4
  let manageableClubs: Array<{
    id: string;
    name: string;
    userRole: "owner" | "admin";
  }> = [];
  if (currentUser) {
    const allClubs = await getUserClubs(currentUser.id);
    // Filter to only owner/admin clubs (SSOT §4.2: options = clubs where role ∈ {owner, admin})
    manageableClubs = allClubs
      .filter(club => club.userRole === "owner" || club.userRole === "admin")
      .map(club => ({
        id: club.id,
        name: club.name,
        userRole: club.userRole as "owner" | "admin",
      }));
  }
  
  // 3. Determine plan limits (use FREE plan as default, club-specific later)
  const freePlan = await getPlanById("free");
  const defaultPlanLimits: ClubPlanLimits = {
    maxMembers: freePlan.maxMembers,
    maxEventParticipants: freePlan.maxEventParticipants,
    allowPaidEvents: freePlan.allowPaidEvents,
    allowCsvExport: freePlan.allowCsvExport,
  };
  
  return (
    <CreateEventPageClient
      isAuthenticated={!!currentUser}
      userCityId={currentUser?.cityId ?? null}
      manageableClubs={manageableClubs}
      defaultPlanLimits={defaultPlanLimits}
      legacyClubId={legacyClubId ?? null}
    />
  );
}
