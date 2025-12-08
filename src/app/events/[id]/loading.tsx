import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div className="space-y-8 py-12">
      {/* Back Button Skeleton */}
      <div className="h-10 w-32 animate-pulse rounded-lg bg-[#F7F7F8]" />

      {/* Header Skeleton */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex-1 space-y-4">
          <div className="h-10 w-3/4 animate-pulse rounded-lg bg-[#F7F7F8]" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-6 w-full animate-pulse rounded bg-[#F7F7F8]" />
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <div className="h-12 w-32 animate-pulse rounded-xl bg-[#F7F7F8]" />
          <div className="h-12 w-32 animate-pulse rounded-xl bg-[#F7F7F8]" />
        </div>
      </div>

      {/* Progress Bar Skeleton */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 animate-pulse rounded bg-[#F7F7F8]" />
          <div className="h-4 w-16 animate-pulse rounded bg-[#F7F7F8]" />
        </div>
        <div className="h-2 w-full animate-pulse rounded-full bg-[#F7F7F8]" />
      </div>

      {/* Spinner */}
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-base text-[#6B7280]">Загружаем детали события...</p>
        </div>
      </div>
    </div>
  );
}

