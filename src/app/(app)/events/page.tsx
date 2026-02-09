/**
 * Events Page
 * 
 * Server Component wrapper for EventsPageClient.
 * All data fetching and state management happens in client component.
 */

import type { Metadata } from "next";
import { EventsPageClient } from "@/components/events/events-page-client";

export const metadata: Metadata = {
  title: "События",
  description: "Ближайшие автомобильные события и оффроуд-поездки",
};

export default function EventsPage() {
  return <EventsPageClient />;
}
