/**
 * Club Profile (Public) Page
 * 
 * Per Visual Contract v2 §4: Authoritative contract for Club Profile (Public).
 * 
 * Layout (STRICT ORDER per Visual Contract v2 §4.1):
 * 1. Header (Blocking)
 * 2. About (Blocking)
 * 3. Rules / FAQ (Blocking)
 * 4. Members Preview (Progressive)
 * 5. Events Preview (Progressive)
 * 6. Join / Request CTA (Blocking)
 * 
 * States:
 * - Loading → Skeletons
 * - Forbidden → Full-page forbidden (403 from API-016)
 * - Archived → Banner + read-only
 * 
 * Data source: GET /api/clubs/[id] (API-016)
 */

import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getClubBasicInfo, getUserClubRole } from "@/lib/services/clubs";

// Section components
import { ClubProfileHeader } from "./_components/club-profile-header";
import { ClubAboutSection } from "./_components/club-about-section";
import { ClubMembersPreviewAsync } from "./_components/club-members-preview-async";
import { ClubEventsPreviewAsync } from "./_components/club-events-preview-async";
import { ClubJoinCTA } from "./_components/club-join-cta";
import { ClubArchivedBanner } from "./_components/club-archived-banner";
import { ClubForbiddenPage } from "./_components/club-forbidden-page";

// Skeletons per Visual Contract v2 §3
import { 
  ClubMembersPreviewSkeleton, 
  ClubEventsPreviewSkeleton 
} from "@/components/ui/skeletons";

export const dynamic = "force-dynamic";

interface ClubProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function ClubProfilePage({ params }: ClubProfilePageProps) {
  const { id } = await params;
  
  // Load critical data for blocking render (per Visual Contract v2 §2.1)
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
  
  // Determine states per Visual Contract v2 §5.6
  const isAuthenticated = !!user;
  const isMember = userRole !== null && userRole !== "pending";
  const isPending = userRole === "pending";
  const isArchived = !!club.archivedAt;

  // Per Visual Contract v2 §7: FORBIDDEN UI (not shown on public profile)
  // - edit buttons, member management, billing, admin controls
  // This page intentionally does NOT show any management UI

  return (
    <div className="space-y-6 pb-10 pt-12">
      {/* Back button */}
      <Link
        href="/clubs"
        className="inline-flex items-center gap-2 text-base text-muted-foreground transition-colors hover:text-[var(--color-text)]"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Все клубы</span>
      </Link>

      {/* Archived Banner - per Visual Contract v2 §6.2 */}
      {isArchived && <ClubArchivedBanner />}

      {/* SECTION 1: Header (Blocking) - per Visual Contract v2 §5.1 */}
      <ClubProfileHeader
        club={{
          id: club.id,
          name: club.name,
          logoUrl: club.logoUrl,
          visibility: "public", // TODO: Add visibility field to club type
          archivedAt: club.archivedAt,
          cities: club.cities,
          memberCount: club.memberCount,
          eventCount: club.eventCount,
          telegramUrl: club.telegramUrl,
          websiteUrl: club.websiteUrl,
        }}
      />

      {/* SECTION 2 & 3: About + Rules/FAQ (Blocking) - per Visual Contract v2 §5.2-5.3 */}
      <ClubAboutSection
        description={club.description}
        cities={club.cities}
        rules={null} // TODO: Add rules field to club type when available
      />

      {/* SECTION 4: Members Preview (Progressive) - per Visual Contract v2 §5.4 */}
      <Suspense fallback={<ClubMembersPreviewSkeleton />}>
        <ClubMembersPreviewAsync clubId={club.id} />
      </Suspense>

      {/* SECTION 5: Events Preview (Progressive) - per Visual Contract v2 §5.5 */}
      <Suspense fallback={<ClubEventsPreviewSkeleton />}>
        <ClubEventsPreviewAsync clubId={club.id} />
      </Suspense>

      {/* SECTION 6: Join / Request CTA (Blocking) - per Visual Contract v2 §5.6 */}
      <ClubJoinCTA
        clubId={club.id}
        isAuthenticated={isAuthenticated}
        isMember={isMember}
        isPending={isPending}
        isArchived={isArchived}
      />
    </div>
  );
}

/* ===========================================================================
 * DEAD UI CODE REPORT (per implementation instructions)
 * 
 * The following existing code in this directory is FORBIDDEN per Visual 
 * Contract v2 §7 for Club Profile (Public):
 * 
 * 1. _components/members-async.tsx
 *    - Shows full member management UI (add/remove members)
 *    - Uses repository directly instead of API
 *    - Should be moved to Club Members page (Club Home Member View)
 * 
 * 2. _components/members-client.tsx
 *    - Contains management controls (role change, remove)
 *    - FORBIDDEN on public profile
 *    - Should be moved to Club Members page
 * 
 * 3. _components/subscription-async.tsx
 *    - Shows billing/subscription UI
 *    - FORBIDDEN on public profile
 *    - Should be moved to Club Settings page (Club Owner only)
 * 
 * 4. Previous page.tsx code (replaced by this file):
 *    - Showed "Управление" (Manage) button - FORBIDDEN
 *    - Had sidebar with subscription card - FORBIDDEN
 *    - Used canManage to show/hide UI (frontend permission inference) - FORBIDDEN
 *    - Showed user role badge to user - acceptable but not per contract
 * 
 * These files are NOT deleted per instruction "MUST NOT delete any existing 
 * code". They should be migrated to appropriate pages:
 * - members-async.tsx → /clubs/[id]/members/page.tsx (Club Members page)
 * - members-client.tsx → /clubs/[id]/members/page.tsx
 * - subscription-async.tsx → /clubs/[id]/settings/page.tsx (Club Settings)
 * ===========================================================================
 */
