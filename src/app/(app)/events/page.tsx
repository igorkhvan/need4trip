/**
 * Events Page
 * 
 * Server Component wrapper for EventsPageClient.
 * All data fetching and state management happens in client component.
 */

import { EventsPageClient } from "@/components/events/events-page-client";

export default function EventsPage() {
  return <EventsPageClient />;
}
