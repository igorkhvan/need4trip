/**
 * ClubEventsPageSkeleton Component
 * 
 * Full-page skeleton for Club Events page.
 * Per Visual Contract v1 — EVENTS §6.1: Page-level skeleton.
 */

export function ClubEventsHeaderSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          {/* Title */}
          <div className="h-8 w-48 animate-pulse rounded bg-[#F7F7F8]" />
          {/* Club name */}
          <div className="h-4 w-32 animate-pulse rounded bg-[#F7F7F8]" />
        </div>
        {/* Create button */}
        <div className="h-10 w-36 animate-pulse rounded-md bg-[#F7F7F8]" />
      </div>
    </div>
  );
}

export function ClubEventsListSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
      {/* Section header */}
      <div className="mb-4 flex items-center gap-2">
        <div className="h-5 w-5 animate-pulse rounded bg-[#F7F7F8]" />
        <div className="h-5 w-28 animate-pulse rounded bg-[#F7F7F8]" />
        <div className="h-5 w-8 animate-pulse rounded-full bg-[#F7F7F8]" />
      </div>

      {/* Event cards */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 p-4 rounded-xl border border-[var(--color-border)]"
          >
            {/* Date block */}
            <div className="flex flex-col items-center justify-center min-w-[60px] rounded-lg bg-[#F7F7F8] p-2">
              <div className="h-4 w-6 animate-pulse rounded bg-white" />
              <div className="h-3 w-8 mt-1 animate-pulse rounded bg-white" />
            </div>

            {/* Event info */}
            <div className="flex-1 min-w-0">
              <div className="h-5 w-3/4 animate-pulse rounded bg-[#F7F7F8]" />
              <div className="flex flex-wrap gap-3 mt-2">
                <div className="h-4 w-32 animate-pulse rounded bg-[#F7F7F8]" />
                <div className="h-4 w-24 animate-pulse rounded bg-[#F7F7F8]" />
                <div className="h-4 w-16 animate-pulse rounded bg-[#F7F7F8]" />
              </div>
              <div className="mt-2">
                <div className="h-5 w-20 animate-pulse rounded-full bg-[#F7F7F8]" />
              </div>
            </div>

            {/* Status badge */}
            <div className="self-center">
              <div className="h-6 w-20 animate-pulse rounded-full bg-[#F7F7F8]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClubEventsPageSkeleton() {
  return (
    <div className="space-y-6">
      <ClubEventsHeaderSkeleton />
      <ClubEventsListSkeleton />
    </div>
  );
}
