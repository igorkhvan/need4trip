/**
 * Events Page — Server Component
 *
 * Fetches initial events server-side for SEO (bots see event cards).
 * Client component handles search, filter, tabs, and pagination.
 *
 * Per SSOT_SEO.md §4.1: indexable pages MUST be server-rendered
 * Per SSOT_SEO.md §5.1: /events is production-ready, indexable
 * Per SSOT_SEO.md §5.3: /events MUST NOT declare noindex
 * Per SSOT_SEO.md §17: pagination self-canonicalization
 * Per SSOT_SEO.md §18: non-SEO query params stripped from canonical
 *
 * NOTE: Using searchParams in generateMetadata forces dynamic rendering
 *       (no ISR). This is acceptable per risk analysis — pagination
 *       canonical compliance requires reading search params at render time.
 */

import type { Metadata } from "next";
import { listVisibleEventsForUserPaginated } from "@/lib/services/events";
import { EventsPageClient } from "@/components/events/events-page-client";
import type { EventsInitialData } from "@/hooks/use-events-query";
import { buildStaticPageMetadata, buildPaginationCanonical } from "@/lib/seo/metadataBuilder";

export const dynamic = "force-dynamic";

/**
 * Per SSOT_SEO.md §5.1: /events is indexable (production-ready).
 * Per SSOT_SEO.md §17.1: paginated pages self-canonicalize.
 * Per SSOT_SEO.md §18.2: only `page` param preserved in canonical.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const params = await searchParams;
  const pageRaw = typeof params.page === "string" ? parseInt(params.page, 10) : undefined;
  const page = pageRaw && !isNaN(pageRaw) && pageRaw > 0 ? pageRaw : undefined;

  return buildStaticPageMetadata({
    title: "События",
    description:
      "Ближайшие автомобильные события и оффроуд-поездки в Казахстане. Присоединяйтесь к автомобильным клубам и находите попутчиков.",
    canonicalPath: buildPaginationCanonical("/events", page),
    ogImageAlt: "События — Need4Trip",
  });
}

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
