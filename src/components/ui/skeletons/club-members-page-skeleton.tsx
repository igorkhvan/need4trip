/**
 * ClubMembersPageSkeleton Component
 * 
 * Skeleton для страницы Club Members согласно Visual Contract v4.
 * Per Visual Contract v4 §9: Full-page skeleton for initial page load.
 * Skeleton layout must match final layout dimensions.
 */

export function ClubMembersHeaderSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        {/* Title */}
        <div className="h-8 w-48 animate-pulse rounded bg-[#F7F7F8]" />
        {/* Visibility badge */}
        <div className="h-6 w-20 animate-pulse rounded-full bg-[#F7F7F8]" />
      </div>
      {/* Subtitle */}
      <div className="mt-2 h-4 w-32 animate-pulse rounded bg-[#F7F7F8]" />
    </div>
  );
}

export function ClubMembersListSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
      {/* Section header */}
      <div className="mb-4 h-6 w-36 animate-pulse rounded bg-[#F7F7F8]" />
      
      {/* Members list */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-xl border border-[var(--color-border)] p-4"
          >
            {/* Avatar */}
            <div className="h-12 w-12 animate-pulse rounded-full bg-[#F7F7F8]" />

            {/* Info */}
            <div className="flex-1 space-y-2">
              <div className="h-5 w-32 animate-pulse rounded bg-[#F7F7F8]" />
              <div className="h-4 w-24 animate-pulse rounded bg-[#F7F7F8]" />
            </div>

            {/* Badge */}
            <div className="h-6 w-20 animate-pulse rounded-full bg-[#F7F7F8]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClubPendingJoinRequestsSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
      {/* Section header */}
      <div className="mb-4 h-6 w-48 animate-pulse rounded bg-[#F7F7F8]" />
      
      {/* Requests list */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-xl border border-[var(--color-border)] p-4"
          >
            {/* Avatar */}
            <div className="h-12 w-12 animate-pulse rounded-full bg-[#F7F7F8]" />

            {/* Info */}
            <div className="flex-1 space-y-2">
              <div className="h-5 w-32 animate-pulse rounded bg-[#F7F7F8]" />
              <div className="h-4 w-40 animate-pulse rounded bg-[#F7F7F8]" />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <div className="h-8 w-8 animate-pulse rounded bg-[#F7F7F8]" />
              <div className="h-8 w-8 animate-pulse rounded bg-[#F7F7F8]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClubMembersPageSkeleton() {
  return (
    <div className="space-y-6">
      <ClubMembersHeaderSkeleton />
      <ClubMembersListSkeleton />
      <ClubPendingJoinRequestsSkeleton />
    </div>
  );
}
