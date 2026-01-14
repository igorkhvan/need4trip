/**
 * ClubProfileSkeleton Component
 * 
 * Skeleton для страницы Club Profile (Public) согласно Visual Contract v2.
 * Сохраняет финальный layout во время загрузки.
 */

export function ClubProfileHeaderSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
      <div className="flex items-start gap-6">
        {/* Logo placeholder */}
        <div className="h-24 w-24 flex-shrink-0 animate-pulse rounded-xl bg-[#F7F7F8]" />

        <div className="flex-1 space-y-3">
          {/* Title + badges */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-48 animate-pulse rounded bg-[#F7F7F8]" />
            <div className="h-6 w-20 animate-pulse rounded-full bg-[#F7F7F8]" />
          </div>

          {/* Meta info */}
          <div className="flex gap-4">
            <div className="h-4 w-24 animate-pulse rounded bg-[#F7F7F8]" />
            <div className="h-4 w-28 animate-pulse rounded bg-[#F7F7F8]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ClubAboutSectionSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
      <div className="h-6 w-24 mb-4 animate-pulse rounded bg-[#F7F7F8]" />
      <div className="space-y-2">
        <div className="h-4 w-full animate-pulse rounded bg-[#F7F7F8]" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-[#F7F7F8]" />
        <div className="h-4 w-3/5 animate-pulse rounded bg-[#F7F7F8]" />
      </div>
    </div>
  );
}

export function ClubMembersPreviewSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
      <div className="h-6 w-32 mb-4 animate-pulse rounded bg-[#F7F7F8]" />
      <div className="flex gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="h-12 w-12 animate-pulse rounded-full bg-[#F7F7F8]" />
            <div className="h-3 w-14 animate-pulse rounded bg-[#F7F7F8]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClubEventsPreviewSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
      <div className="h-6 w-36 mb-4 animate-pulse rounded bg-[#F7F7F8]" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-3 rounded-lg border border-[var(--color-border)]">
            <div className="h-16 w-16 animate-pulse rounded-lg bg-[#F7F7F8]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-[#F7F7F8]" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-[#F7F7F8]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClubJoinCTASkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
      <div className="h-12 w-full animate-pulse rounded-xl bg-[#F7F7F8]" />
    </div>
  );
}

export function ClubProfileSkeleton() {
  return (
    <div className="space-y-6">
      <ClubProfileHeaderSkeleton />
      <ClubAboutSectionSkeleton />
      <ClubMembersPreviewSkeleton />
      <ClubEventsPreviewSkeleton />
      <ClubJoinCTASkeleton />
    </div>
  );
}
