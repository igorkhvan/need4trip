import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div className="space-y-8 py-12">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="h-10 w-48 animate-pulse rounded-lg bg-[#F7F7F8]" />
          <div className="h-6 w-96 animate-pulse rounded-lg bg-[#F7F7F8]" />
        </div>
        <div className="h-12 w-40 animate-pulse rounded-xl bg-[#F7F7F8]" />
      </div>

      {/* Event Cards Grid Skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm"
          >
            <div className="space-y-4">
              {/* Title */}
              <div className="h-7 w-3/4 animate-pulse rounded bg-[#F7F7F8]" />
              
              {/* Meta info */}
              <div className="space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-[#F7F7F8]" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-[#F7F7F8]" />
              </div>
              
              {/* Progress bar */}
              <div className="space-y-1">
                <div className="h-3 w-20 animate-pulse rounded bg-[#F7F7F8]" />
                <div className="h-2 w-full animate-pulse rounded-full bg-[#F7F7F8]" />
              </div>
              
              {/* Button */}
              <div className="h-10 w-full animate-pulse rounded-xl bg-[#F7F7F8]" />
            </div>
          </div>
        ))}
      </div>

      {/* Spinner */}
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-base text-[#6B7280]">Загружаем список событий...</p>
        </div>
      </div>
    </div>
  );
}

