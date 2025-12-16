/**
 * ClubMembersSkeleton Component
 * 
 * Skeleton для списка участников клуба.
 */

export function ClubMembersSkeleton() {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="h-6 w-32 animate-pulse rounded bg-[#F7F7F8]" />
        <div className="h-8 w-8 animate-pulse rounded bg-[#F7F7F8]" />
      </div>

      {/* Members list */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-xl border border-[#E5E7EB] p-4"
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

            {/* Actions */}
            <div className="h-8 w-8 animate-pulse rounded bg-[#F7F7F8]" />
          </div>
        ))}
      </div>
    </div>
  );
}
