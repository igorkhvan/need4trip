/**
 * UpcomingEventsSkeleton Component
 * 
 * Skeleton для секции предстоящих событий на homepage.
 */

export function UpcomingEventsSkeleton() {
  return (
    <section className="page-container py-24 md:py-32">
      {/* Header */}
      <div className="mb-16 text-center">
        <div className="mb-4 h-10 w-64 animate-pulse rounded bg-[#F7F7F8] mx-auto" />
        <div className="mx-auto h-6 w-96 animate-pulse rounded bg-[#F7F7F8]" />
      </div>

      {/* Event Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm"
          >
            {/* Header: Icon + Badge */}
            <div className="mb-4 flex items-start justify-between">
              <div className="h-12 w-12 animate-pulse rounded-xl bg-[#F7F7F8]" />
              <div className="h-6 w-20 animate-pulse rounded-full bg-[#F7F7F8]" />
            </div>

            {/* Title */}
            <div className="mb-3 h-7 w-3/4 animate-pulse rounded bg-[#F7F7F8]" />

            {/* Meta */}
            <div className="mb-4 flex items-center gap-4">
              <div className="h-4 w-24 animate-pulse rounded bg-[#F7F7F8]" />
              <div className="h-4 w-16 animate-pulse rounded bg-[#F7F7F8]" />
            </div>

            {/* Description */}
            <div className="mb-4 space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-[#F7F7F8]" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-[#F7F7F8]" />
            </div>

            {/* Link */}
            <div className="h-4 w-24 animate-pulse rounded bg-[#F7F7F8]" />
          </div>
        ))}
      </div>
    </section>
  );
}
