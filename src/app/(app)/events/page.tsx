/**
 * Events Page
 * 
 * Server Component wrapper for EventsPageClient.
 * All data fetching and state management happens in client component.
 */

import type { Metadata } from "next";
import { EventsPageClient } from "@/components/events/events-page-client";

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

export default function EventsPage() {
  return <EventsPageClient />;
}
