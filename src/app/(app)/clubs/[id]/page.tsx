/**
 * Club Profile Page
 * 
 * Per Visual Contract v6 — CLUB PROFILE (v1 FINAL):
 * This page is an aggregation and navigation surface (READ-ONLY).
 * 
 * Layout (STRICT ORDER per Visual Contract v6 §3):
 * 1. Archived Banner (conditional)
 * 2. Club Header
 * 3. Primary CTA Zone
 * 4. About Section
 * 5. Members Preview
 * 6. Events Preview
 * 
 * States:
 * - Loading → Skeletons
 * - Forbidden → Full-page forbidden (403)
 * - Archived → Banner + CTA hidden + entry points hidden
 * 
 * Data source: GET /api/clubs/[id] (API-016)
 */

import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { resolveCurrentUser } from "@/lib/auth/resolveCurrentUser";
import { getClubBasicInfo, getUserClubRole } from "@/lib/services/clubs";
import { truncateText } from "@/lib/utils/text";

// Section components
import { ClubProfileHeader } from "./_components/club-profile-header";
import { ClubAboutSection } from "./_components/club-about-section";
import { ClubMembersPreviewAsync } from "./_components/club-members-preview-async";
import { ClubEventsPreviewAsync } from "./_components/club-events-preview-async";
import { ClubJoinCTA } from "./_components/club-join-cta";
import { ClubArchivedBanner } from "./_components/club-archived-banner";
import { ClubForbiddenPage } from "./_components/club-forbidden-page";

// Skeletons
import { 
  ClubMembersPreviewSkeleton, 
  ClubEventsPreviewSkeleton 
} from "@/components/ui/skeletons";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// OG / Social Sharing metadata
// See: docs/blueprint/OG_SOCIAL_SHARING_BLUEPRINT.md
// ---------------------------------------------------------------------------
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  let club: Awaited<ReturnType<typeof getClubBasicInfo>> | null = null;
  try {
    club = await getClubBasicInfo(id);
  } catch {
    // NotFoundError → default metadata
    return { title: "Клуб не найден" };
  }

  // Private clubs: show name but no details (non-member sees minimal page + CTA)
  if (club.visibility === "private") {
    const privateDescription =
      "Закрытый клуб на Need4Trip. Вступите, чтобы увидеть события и участников.";
    return {
      title: club.name,
      description: privateDescription,
      openGraph: {
        title: club.name,
        description: privateDescription,
        images: [club.logoUrl || "/og-default.png"],
        url: `/clubs/${id}`,
      },
      twitter: {
        card: "summary_large_image",
        title: club.name,
        description: privateDescription,
        images: [club.logoUrl || "/og-default.png"],
      },
    };
  }

  // Public clubs: full metadata
  const description = club.description
    ? truncateText(club.description, 160)
    : "Автомобильный клуб на Need4Trip";

  const citiesText = club.cities?.length
    ? club.cities.map((c) => c.name).join(", ")
    : null;

  const metaParts: string[] = [];
  if (citiesText) metaParts.push(citiesText);
  metaParts.push(`${club.memberCount} участников`);
  metaParts.push(`${club.upcomingEventCount} событий`);
  const metaPrefix = metaParts.join(" · ");

  const fullDescription = `${metaPrefix} — ${description}`;
  const ogImage = club.logoUrl || "/og-default.png";

  return {
    title: club.name,
    description: truncateText(fullDescription, 200),
    openGraph: {
      title: club.name,
      description: truncateText(fullDescription, 200),
      images: [ogImage],
      url: `/clubs/${id}`,
    },
    twitter: {
      card: "summary_large_image",
      title: club.name,
      description: truncateText(fullDescription, 200),
      images: [ogImage],
    },
  };
}

interface ClubProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function ClubProfilePage({ params }: ClubProfilePageProps) {
  const { id } = await params;
  
  // Load critical data for blocking render
  // ADR-001: Use resolveCurrentUser for canonical auth resolution in RSC
  const [user, clubResult] = await Promise.all([
    resolveCurrentUser(),
    getClubBasicInfo(id).catch(() => null),
  ]);

  // 404: Club not found
  if (!clubResult) {
    notFound();
  }

  const club = clubResult;
  
  // Get user's role in club (if authenticated)
  const userRole = user ? await getUserClubRole(id, user.id) : null;
  
  // Determine states per Visual Contract v6 §5
  const isAuthenticated = !!user;
  const isMember = userRole !== null && userRole !== "pending";
  const isPending = userRole === "pending";
  const isArchived = !!club.archivedAt;
  const isOwnerOrAdmin = userRole === "owner" || userRole === "admin";
  const openJoinEnabled = club.settings?.openJoinEnabled ?? false;

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

      {/* SECTION: Archived Banner (conditional) - per Visual Contract v6 §4 */}
      {isArchived && <ClubArchivedBanner />}

      {/* SECTION: Club Header - per Visual Contract v6 §3 */}
      {/* P0 FIX: Owner/Admin Entry Points now inline inside Header */}
      <ClubProfileHeader
        club={{
          id: club.id,
          name: club.name,
          logoUrl: club.logoUrl,
          visibility: club.visibility ?? "public",
          archivedAt: club.archivedAt,
          cities: club.cities,
          memberCount: club.memberCount,
          upcomingEventCount: club.upcomingEventCount,
          telegramUrl: club.telegramUrl,
          websiteUrl: club.websiteUrl,
        }}
        isOwnerOrAdmin={isOwnerOrAdmin}
        isArchived={isArchived}
      />

      {/* SECTION: Primary CTA Zone - per Visual Contract v6 §5 */}
      {/* Hidden when club is archived (§4) or user is member/owner/admin (§5.3, §5.4) */}
      {!isArchived && (
        <ClubJoinCTA
          clubId={club.id}
          isAuthenticated={isAuthenticated}
          isMember={isMember}
          isPending={isPending}
          isArchived={isArchived}
          openJoinEnabled={openJoinEnabled}
        />
      )}

      {/* SECTION: About - per Visual Contract v6 §7 */}
      <ClubAboutSection
        description={club.description}
        cities={club.cities}
      />

      {/* SECTION: Members Preview - per Visual Contract v6 §8 */}
      {/* ADR-001.5: Pass currentUser to avoid HTTP API middleware issues */}
      <Suspense fallback={<ClubMembersPreviewSkeleton />}>
        <ClubMembersPreviewAsync clubId={club.id} currentUser={user} />
      </Suspense>

      {/* SECTION: Events Preview - per Visual Contract v6 §9 */}
      {/* ADR-001.4: Pass currentUser to avoid HTTP API middleware issues */}
      {/* SSOT_CLUBS_DOMAIN §4.5: Private club + non-member → Events preview NOT rendered */}
      {(club.visibility !== "private" || isMember) && (
        <Suspense fallback={<ClubEventsPreviewSkeleton />}>
          <ClubEventsPreviewAsync clubId={club.id} currentUser={user} />
        </Suspense>
      )}
    </div>
  );
}
