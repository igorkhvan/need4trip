/**
 * ClubCardSkeleton Component
 * 
 * Skeleton для карточки клуба. Соответствует структуре ClubCard.
 * Используется в списках клубов и loading.tsx файлах.
 */

export function ClubCardSkeleton() {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      {/* Header: Logo + Badge */}
      <div className="mb-4 flex items-start justify-between">
        <div className="h-12 w-12 animate-pulse rounded-full bg-[#F7F7F8]" />
        <div className="h-6 w-20 animate-pulse rounded-full bg-[#F7F7F8]" />
      </div>

      {/* Title */}
      <div className="mb-2 h-7 w-3/4 animate-pulse rounded bg-[#F7F7F8]" />

      {/* Description */}
      <div className="mb-4 space-y-2">
        <div className="h-4 w-full animate-pulse rounded bg-[#F7F7F8]" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-[#F7F7F8]" />
      </div>

      {/* Stats */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-pulse rounded bg-[#F7F7F8]" />
          <div className="h-4 w-24 animate-pulse rounded bg-[#F7F7F8]" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-pulse rounded bg-[#F7F7F8]" />
          <div className="h-4 w-32 animate-pulse rounded bg-[#F7F7F8]" />
        </div>
      </div>

      {/* Button */}
      <div className="h-10 w-full animate-pulse rounded-xl bg-[#F7F7F8]" />
    </div>
  );
}

/**
 * ClubCardSkeletonGrid - сетка skeleton для списка клубов
 */
export function ClubCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ClubCardSkeleton key={i} />
      ))}
    </div>
  );
}
