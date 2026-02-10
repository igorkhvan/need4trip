/**
 * Clubs List Page — Server Component
 *
 * Fetches initial clubs server-side for SEO (bots see club cards).
 * Client component handles search, filter, and pagination.
 *
 * Per SSOT_SEO.md §4.1: indexable pages MUST be server-rendered
 * Per SSOT_SEO.md §4.2: ISR recommended for listings
 */

import { listClubs } from "@/lib/services/clubs";
import { ClubsPageClient } from "@/components/clubs/clubs-page-client";

export const revalidate = 60; // ISR: 1 minute

export default async function ClubsPage() {
  let initialClubs;
  let initialTotal = 0;

  try {
    const result = await listClubs(1, 12);
    initialClubs = result.clubs;
    initialTotal = result.total;
  } catch {
    // Fallback: client component will fetch from API
  }

  return (
    <ClubsPageClient
      initialClubs={initialClubs}
      initialTotal={initialTotal}
    />
  );
}
