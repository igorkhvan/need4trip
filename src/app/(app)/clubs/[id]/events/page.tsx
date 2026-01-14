/**
 * Club Events Page
 * 
 * Per Visual Contract v1 — EVENTS (CLUBS_UI_VISUAL_CONTRACT v1):
 * 
 * Layout (STRICT ORDER per Visual Contract v1 §4):
 * 1. Page Header (Blocking) - Title + Create Event button
 * 2. Archived Banner (Conditional, Blocking)
 * 3. Events List Section (Blocking)
 * 4. Empty State (Conditional)
 * 
 * States:
 * - Loading → Full-page skeleton
 * - Forbidden (403) → Full-page forbidden
 * - Archived → read-only UI, banner shown
 * 
 * Data sources:
 * - Club context: GET /api/clubs/[id] (API-016)
 * - Events: GET /api/clubs/[id]/events (API-057)
 * 
 * Authorization:
 * - Owner/Admin: create, edit, delete events
 * - Member: read-only access
 * - Guest: Forbidden (403)
 */

import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getClubBasicInfo, getUserClubRole } from "@/lib/services/clubs";

// Section components
import { ClubEventsHeader } from "./_components/club-events-header";
import { ClubEventsContent } from "./_components/club-events-content";
import { ClubArchivedBanner } from "../_components/club-archived-banner";
import { ClubForbiddenPage } from "../_components/club-forbidden-page";

// Skeletons per Visual Contract v1 §6
import { ClubEventsPageSkeleton } from "@/components/ui/skeletons";

export const dynamic = "force-dynamic";

interface ClubEventsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClubEventsPage({ params }: ClubEventsPageProps) {
  const { id } = await params;

  // Load critical data for blocking render (per Visual Contract v1 §6.1)
  const [user, clubResult] = await Promise.all([
    getCurrentUser(),
    getClubBasicInfo(id).catch(() => null),
  ]);

  // 404: Club not found
  if (!clubResult) {
    notFound();
  }

  const club = clubResult;

  // Get user's role in club (if authenticated)
  const userRole = user ? await getUserClubRole(id, user.id) : null;

  // Determine states per Visual Contract v1 §7
  const isMember = userRole !== null && userRole !== "pending";
  const isArchived = !!club.archivedAt;

  // 403: Not authenticated or not a member (per Visual Contract v1 §7.1)
  // Per Visual Contract v1 §4: Visible to member, admin, owner only
  if (!user || !isMember) {
    return (
      <div className="space-y-6 pb-10 pt-12">
        <Link
          href={`/clubs/${id}`}
          className="inline-flex items-center gap-2 text-base text-muted-foreground transition-colors hover:text-[var(--color-text)]"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>К профилю клуба</span>
        </Link>
        <ClubForbiddenPage message="У вас нет доступа к событиям клуба. Вступите в клуб для просмотра событий." />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 pt-12">
      {/* Back button */}
      <Link
        href={`/clubs/${id}`}
        className="inline-flex items-center gap-2 text-base text-muted-foreground transition-colors hover:text-[var(--color-text)]"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>К профилю клуба</span>
      </Link>

      {/* SECTION 2: Archived Banner (Conditional, Blocking) - per Visual Contract v1 §4.3 */}
      {isArchived && <ClubArchivedBanner />}

      {/* SECTION 1: Header (Blocking) - per Visual Contract v1 §4.2 */}
      <ClubEventsHeader
        clubId={id}
        clubName={club.name}
        userRole={userRole}
        isArchived={isArchived}
      />

      {/* SECTION 3 & 4: Events List + Empty State */}
      {/* Use Suspense for client-side data fetching */}
      <Suspense fallback={<ClubEventsPageSkeleton />}>
        <ClubEventsContent
          clubId={id}
          userRole={userRole}
          isArchived={isArchived}
        />
      </Suspense>
    </div>
  );
}

/* ===========================================================================
 * DEAD UI CODE REPORT (per implementation instructions)
 * 
 * The following existing code in parent directory may conflict with this page:
 * 
 * 1. ../_components/club-events-preview-async.tsx
 *    - Shows limited event preview for Club Profile (Public) page
 *    - Uses different API endpoint (GET /api/events?clubId=...)
 *    - NOT a conflict: Different purpose (preview vs full list)
 *    - Status: LEFT UNTOUCHED
 * 
 * 2. No other conflicting code found in clubs domain.
 * 
 * ===========================================================================
 */
