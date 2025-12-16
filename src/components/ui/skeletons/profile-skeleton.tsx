/**
 * ProfileSkeleton Components
 * 
 * Skeleton компоненты для страницы профиля.
 */

/**
 * ProfileHeaderSkeleton - шапка профиля
 */
export function ProfileHeaderSkeleton() {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-6 md:flex-row md:items-center">
        {/* Avatar */}
        <div className="h-24 w-24 animate-pulse rounded-full bg-[#F7F7F8]" />

        {/* Info */}
        <div className="flex-1 space-y-3">
          <div className="h-8 w-48 animate-pulse rounded bg-[#F7F7F8]" />
          <div className="space-y-2">
            <div className="h-4 w-64 animate-pulse rounded bg-[#F7F7F8]" />
            <div className="h-4 w-56 animate-pulse rounded bg-[#F7F7F8]" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-[#F7F7F8]" />
          <div className="h-10 w-32 animate-pulse rounded-xl bg-[#F7F7F8]" />
        </div>
      </div>
    </div>
  );
}

/**
 * ProfileTabsSkeleton - табы профиля
 */
export function ProfileTabsSkeleton() {
  return (
    <div className="flex gap-4 border-b border-[#E5E7EB]">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-10 w-24 animate-pulse rounded-t bg-[#F7F7F8]" />
      ))}
    </div>
  );
}

/**
 * ProfileCardSkeleton - карточка в разделе профиля
 */
export function ProfileCardSkeleton() {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-6 w-32 animate-pulse rounded bg-[#F7F7F8]" />
        <div className="h-8 w-8 animate-pulse rounded bg-[#F7F7F8]" />
      </div>

      <div className="space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-[#F7F7F8]" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-[#F7F7F8]" />
        <div className="h-4 w-4/6 animate-pulse rounded bg-[#F7F7F8]" />
      </div>
    </div>
  );
}

/**
 * ProfileContentSkeleton - полный контент профиля
 */
export function ProfileContentSkeleton() {
  return (
    <div className="container-custom space-y-6 py-12">
      <ProfileHeaderSkeleton />
      <ProfileTabsSkeleton />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <ProfileCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
