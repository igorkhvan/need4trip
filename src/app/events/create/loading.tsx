import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div className="space-y-8 py-12">
      {/* Back Button Skeleton */}
      <div className="h-10 w-32 animate-pulse rounded-lg bg-[#F7F7F8]" />

      {/* Header Skeleton */}
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-[#F7F7F8]" />
        <div className="h-6 w-96 animate-pulse rounded-lg bg-[#F7F7F8]" />
      </div>

      {/* Form Skeleton */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
        <div className="space-y-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-5 w-32 animate-pulse rounded bg-[#F7F7F8]" />
              <div className="h-12 w-full animate-pulse rounded-xl bg-[#F7F7F8]" />
            </div>
          ))}
        </div>
      </div>

      {/* Spinner */}
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-base text-[#6B7280]">Подготовка формы...</p>
        </div>
      </div>
    </div>
  );
}

