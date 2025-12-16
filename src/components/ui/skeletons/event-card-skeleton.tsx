/**
 * EventCardSkeleton Component
 * 
 * Skeleton для карточки события. Соответствует структуре EventCard.
 * Используется в списках событий и EventsGrid.
 */

export function EventCardSkeleton() {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      {/* Header: Title + Badge */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-7 w-3/4 animate-pulse rounded bg-[#F7F7F8]" />
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-pulse rounded bg-[#F7F7F8]" />
            <div className="h-4 w-32 animate-pulse rounded bg-[#F7F7F8]" />
          </div>
        </div>
        <div className="h-6 w-24 animate-pulse rounded-full bg-[#F7F7F8]" />
      </div>

      {/* Info Grid */}
      <div className="mb-4 grid grid-cols-2 gap-4 rounded-xl bg-[#F7F7F8] p-4">
        <div className="space-y-1">
          <div className="h-3 w-20 animate-pulse rounded bg-white" />
          <div className="h-4 w-28 animate-pulse rounded bg-white" />
        </div>
        <div className="space-y-1">
          <div className="h-3 w-20 animate-pulse rounded bg-white" />
          <div className="h-4 w-24 animate-pulse rounded bg-white" />
        </div>
        <div className="space-y-1">
          <div className="h-3 w-20 animate-pulse rounded bg-white" />
          <div className="h-4 w-16 animate-pulse rounded bg-white" />
        </div>
        <div className="space-y-1">
          <div className="h-3 w-20 animate-pulse rounded bg-white" />
          <div className="h-4 w-20 animate-pulse rounded bg-white" />
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="h-3 w-24 animate-pulse rounded bg-[#F7F7F8]" />
        <div className="h-2 w-full animate-pulse rounded-full bg-[#F7F7F8]" />
      </div>
    </div>
  );
}

/**
 * EventCardSkeletonGrid - сетка skeleton для списка событий
 */
export function EventCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}
