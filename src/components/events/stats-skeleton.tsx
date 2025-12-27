/**
 * StatsSkeleton Component
 * 
 * Skeleton для stats cards на Events странице.
 * Соответствует структуре stats section в EventsGrid.
 * 
 * Используется при загрузке статистики (независимо от загрузки списка событий).
 */

export function StatsSkeleton() {
  return (
    <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide sm:mx-0 sm:px-0">
      <div className="flex gap-4 md:grid md:grid-cols-3 min-w-max md:min-w-0">
        {/* Card 1: Всего событий */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm min-w-[240px] md:min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex-1 space-y-3">
              <div className="h-4 w-28 animate-pulse rounded bg-[#F7F7F8]" />
              <div className="h-10 w-16 animate-pulse rounded bg-[#F7F7F8]" />
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F7F7F8] animate-pulse" />
          </div>
        </div>

        {/* Card 2: Активных регистраций */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm min-w-[240px] md:min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex-1 space-y-3">
              <div className="h-4 w-32 animate-pulse rounded bg-[#F7F7F8]" />
              <div className="h-10 w-16 animate-pulse rounded bg-[#F7F7F8]" />
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F7F7F8] animate-pulse" />
          </div>
        </div>

        {/* Card 3: Всего участников */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm min-w-[240px] md:min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex-1 space-y-3">
              <div className="h-4 w-32 animate-pulse rounded bg-[#F7F7F8]" />
              <div className="h-10 w-16 animate-pulse rounded bg-[#F7F7F8]" />
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F7F7F8] animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

