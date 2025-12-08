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

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm"
          >
            <div className="space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-[#F7F7F8]" />
              <div className="h-9 w-16 animate-pulse rounded bg-[#F7F7F8]" />
            </div>
            <div className="h-12 w-12 animate-pulse rounded-xl bg-[#F7F7F8]" />
          </div>
        ))}
      </div>

      {/* Tabs Skeleton */}
      <div className="flex items-center gap-1 border-b border-[#E5E7EB]">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 w-32 animate-pulse rounded-t-lg bg-[#F7F7F8]" />
        ))}
      </div>

      {/* Search Skeleton */}
      <div className="h-12 w-full max-w-md animate-pulse rounded-xl bg-[#F7F7F8]" />

      {/* Spinner */}
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-base text-[#6B7280]">Загружаем события...</p>
        </div>
      </div>
    </div>
  );
}

