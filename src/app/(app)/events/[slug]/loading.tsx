/**
 * Event Detail Loading State
 * 
 * SSOT_UI_ASYNC_PATTERNS — navigation is immediate; loading handled on target page
 * SSOT_UI_STRUCTURE — page shell renders immediately, skeleton for data
 * SSOT_EVENTS_UX_V1.1 §2 — Event detail page loading shows skeleton
 * 
 * This file is automatically rendered by Next.js during navigation
 * while the server component fetches data.
 */

import { EventDetailSkeleton } from "@/components/ui/skeletons";

export default function EventDetailLoading() {
  return <EventDetailSkeleton />;
}
