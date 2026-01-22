/**
 * Club Members Page
 * 
 * Per Visual Contract v4 (CLUBS_UI_VISUAL_CONTRACT V4 MEMBERS):
 * Per Visual Contract v5 (CLUBS_UI_VISUAL_CONTRACT V5 MEMBERSHIP REQUESTS):
 * 
 * Layout (STRICT ORDER per Visual Contract v4 §3):
 * 1. Header (Blocking)
 * 2. Members List (Blocking)
 * 3. Pending Join Requests (Blocking, owner/admin - per V5 §4)
 * 
 * States:
 * - Loading → Full-page skeleton
 * - Forbidden (403) → Full-page forbidden
 * - Archived → read-only UI
 * 
 * Data sources:
 * - Header: GET /api/clubs/[id] (API-016)
 * - Members: GET /api/clubs/[id]/members (API-019)
 * - Join Requests: GET /api/clubs/[id]/join-requests (API-054) - owner/admin
 */

import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getClubBasicInfo, getUserClubRole } from "@/lib/services/clubs";

// Section components
import { ClubMembersHeader } from "./_components/club-members-header";
import { ClubArchivedBanner } from "../_components/club-archived-banner";
import { ClubForbiddenPage } from "../_components/club-forbidden-page";
import { ClubMembersContent } from "./_components/club-members-content";

// Skeletons per Visual Contract v4 §9
import { ClubMembersPageSkeleton } from "@/components/ui/skeletons";

export const dynamic = "force-dynamic";

interface ClubMembersPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClubMembersPage({ params }: ClubMembersPageProps) {
  const { id } = await params;
  
  // Load critical data for blocking render (per Visual Contract v4 §9)
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
  
  // Determine states per Visual Contract v4 §1, V5 §4
  const isMember = userRole !== null && userRole !== "pending";
  const isOwner = userRole === "owner";
  const isAdmin = userRole === "admin";
  const isArchived = !!club.archivedAt;
  // Per V5 §4: Join Requests section visible to Owner OR Admin
  const canManageRequests = isOwner || isAdmin;

  // SSOT: SSOT_UI_STATES.md §5.3 — Forbidden MUST NOT be embedded inline
  // SSOT: SSOT_UX_GOVERNANCE.md §4.4 — Forbidden MUST use canonical SYSTEM layout
  // FIX: Removed inline wrapper, ClubForbiddenPage is self-contained with ONE escape action
  if (!user || !isMember) {
    return (
      <ClubForbiddenPage message="Нет доступа. Вступите в клуб, чтобы видеть участников." />
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

      {/* Archived Banner - per Visual Contract v4 §7 */}
      {isArchived && <ClubArchivedBanner />}

      {/* SECTION 1: Header (Blocking) - per Visual Contract v4 §4 */}
      <ClubMembersHeader
        club={{
          name: club.name,
          visibility: "public", // TODO: Add visibility field to club type
          archivedAt: club.archivedAt,
        }}
      />

      {/* SECTIONS 2 & 3: Members List + Pending Join Requests */}
      {/* Use Suspense for client-side data fetching */}
      <Suspense fallback={<ClubMembersPageSkeleton />}>
        <ClubMembersContent
          clubId={id}
          currentUserId={user.id}
          currentUserRole={userRole}
          canManageRequests={canManageRequests}
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
 * 1. ../page.tsx (Club Profile Public) - OK, different page
 *    - Contains DEAD UI CODE REPORT noting:
 *      - members-async.tsx: Should be moved here
 *      - members-client.tsx: Should be moved here
 *    - These files are NOT deleted per instruction
 * 
 * 2. ../settings/page.tsx - Canonical Club Settings page
 * 
 * Legacy components in ../_components/ that relate to members:
 * - members-async.tsx: Legacy full member management, uses repo directly
 * - members-client.tsx: Legacy client-side member controls
 * 
 * These files are NOT deleted per instruction "MUST NOT delete any existing 
 * code". They should be deprecated in favor of the new implementation:
 * - members/_components/club-members-list.tsx
 * - members/_components/club-pending-join-requests.tsx
 * ===========================================================================
 */
