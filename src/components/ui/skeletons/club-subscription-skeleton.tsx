/**
 * ClubSubscriptionSkeleton Component
 * 
 * Skeleton для карточки подписки клуба.
 */

export function ClubSubscriptionSkeleton() {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      {/* Title */}
      <div className="mb-4 h-6 w-32 animate-pulse rounded bg-[#F7F7F8]" />

      {/* Plan name */}
      <div className="mb-3 h-8 w-48 animate-pulse rounded bg-[#F7F7F8]" />

      {/* Info blocks */}
      <div className="space-y-4">
        <div className="rounded-xl bg-[#F7F7F8] p-4">
          <div className="mb-2 h-4 w-24 animate-pulse rounded bg-white" />
          <div className="h-5 w-32 animate-pulse rounded bg-white" />
        </div>

        <div className="rounded-xl bg-[#F7F7F8] p-4">
          <div className="mb-2 h-4 w-20 animate-pulse rounded bg-white" />
          <div className="h-5 w-24 animate-pulse rounded bg-white" />
        </div>
      </div>

      {/* Button */}
      <div className="mt-6 h-12 w-full animate-pulse rounded-xl bg-[#F7F7F8]" />
    </div>
  );
}
