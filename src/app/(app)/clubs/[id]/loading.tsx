/**
 * Club Profile Loading State
 * 
 * SSOT_UI_ASYNC_PATTERNS — navigation is immediate; loading handled on target page
 * SSOT_UI_STRUCTURE — page shell renders immediately, skeleton for data
 * 
 * This file is automatically rendered by Next.js during navigation
 * while the server component fetches data.
 */

import { ClubProfileSkeleton } from "@/components/ui/skeletons";

export default function ClubProfileLoading() {
  return (
    <div className="pb-10 pt-12">
      <ClubProfileSkeleton />
    </div>
  );
}
