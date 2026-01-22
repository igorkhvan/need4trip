/**
 * ProfileEditSkeleton
 * 
 * Skeleton for profile edit page.
 * SSOT: SSOT_UI_ASYNC_PATTERNS.md §3 Pattern C — skeleton MUST match final layout geometry.
 * SSOT: SSOT_UX_GOVERNANCE.md §3.3 — skeletons MUST appear immediately on first load.
 */

import { Card, CardContent } from "@/components/ui/card";

/**
 * ProfileEditSkeleton — matches profile/edit page layout
 */
export function ProfileEditSkeleton() {
  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="h-5 w-40 animate-pulse rounded bg-[#F7F7F8]" />

      {/* Header */}
      <div>
        <div className="h-8 w-56 animate-pulse rounded bg-[#F7F7F8] mb-2" />
        <div className="h-4 w-80 animate-pulse rounded bg-[#F7F7F8]" />
      </div>

      {/* Avatar Section */}
      <Card>
        <CardContent className="p-5 md:p-6">
          <div className="h-6 w-32 animate-pulse rounded bg-[#F7F7F8] mb-4" />
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-2xl animate-pulse bg-[#F7F7F8]" />
            <div className="space-y-2">
              <div className="h-4 w-48 animate-pulse rounded bg-[#F7F7F8]" />
              <div className="h-9 w-28 animate-pulse rounded-lg bg-[#F7F7F8]" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardContent className="p-4">
          <div className="h-6 w-40 animate-pulse rounded bg-[#F7F7F8] mb-3" />
          <div className="space-y-3">
            {/* Name field */}
            <div className="space-y-2">
              <div className="h-4 w-12 animate-pulse rounded bg-[#F7F7F8]" />
              <div className="h-12 w-full animate-pulse rounded-xl bg-[#F7F7F8]" />
            </div>
            {/* City field */}
            <div className="space-y-2">
              <div className="h-4 w-16 animate-pulse rounded bg-[#F7F7F8]" />
              <div className="h-12 w-full animate-pulse rounded-xl bg-[#F7F7F8]" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Car Information */}
      <Card>
        <CardContent className="p-4">
          <div className="h-6 w-48 animate-pulse rounded bg-[#F7F7F8] mb-3" />
          <div className="space-y-3">
            {/* Brand field */}
            <div className="space-y-2">
              <div className="h-4 w-16 animate-pulse rounded bg-[#F7F7F8]" />
              <div className="h-12 w-full animate-pulse rounded-xl bg-[#F7F7F8]" />
            </div>
            {/* Model field */}
            <div className="space-y-2">
              <div className="h-4 w-20 animate-pulse rounded bg-[#F7F7F8]" />
              <div className="h-12 w-full animate-pulse rounded-xl bg-[#F7F7F8]" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="h-12 sm:flex-1 animate-pulse rounded-xl bg-[#F7F7F8]" />
        <div className="h-12 sm:flex-1 animate-pulse rounded-xl bg-[#F7F7F8]" />
      </div>
    </div>
  );
}
