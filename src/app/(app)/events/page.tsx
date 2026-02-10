/**
 * Events Page — Server Component
 *
 * Fetches initial events server-side for SEO (bots see event cards).
 * Client component handles search, filter, tabs, and pagination.
 *
 * Per SSOT_SEO.md §4.1: indexable pages MUST be server-rendered
 * Per SSOT_SEO.md §4.2: ISR recommended for listings
 * Per SSOT_SEO.md §5.3: listing pages noindex during beta
 */

import type { Metadata } from "next";
import { listVisibleEventsForUserPaginated } from "@/lib/services/events";
import { EventsPageClient } from "@/components/events/events-page-client";
import type { EventsInitialData } from "@/hooks/use-events-query";

export const revalidate = 60; // ISR: 1 minute

/**
 * Per SSOT_SEO.md §5.3: listing pages noindex during beta
 */
export const metadata: Metadata = {
  title: "События",
  description: "Ближайшие автомобильные события и оффроуд-поездки",
  robots: {
    index: false,
    follow: true,
  },
};

export default async function EventsPage() {
  let initialData: EventsInitialData | undefined;

  try {
    // Fetch default view: upcoming events, page 1, no auth (anonymous)
    const result = await listVisibleEventsForUserPaginated(
      {
        filters: { tab: "upcoming" },
        sort: { sort: "date" },
        pagination: { page: 1, limit: 12 },
      },
      null // anonymous user — public events only
    );

    initialData = {
      events: result.events,
      meta: result.meta,
    };
  } catch {
    // Fallback: client component will fetch from API
  }

  return <EventsPageClient initialData={initialData} />;
}
