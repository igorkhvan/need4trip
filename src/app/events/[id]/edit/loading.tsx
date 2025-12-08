import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div className="space-y-8 py-12">
      {/* Back Button Skeleton */}
      <div className="h-10 w-32 animate-pulse rounded-lg bg-[#F7F7F8]" />

      {/* Header Skeleton */}
      <div className="space-y-4">
        <div className="h-10 w-96 animate-pulse rounded-lg bg-[#F7F7F8]" />
        <div className="h-6 w-full max-w-2xl animate-pulse rounded-lg bg-[#F7F7F8]" />
      </div>

      {/* Form Cards Skeleton */}
      <div className="space-y-6">
        {[1, 2, 3, 4].map((cardNum) => (
          <div key={cardNum} className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
            {/* Card Header */}
            <div className="mb-4 flex items-center gap-3">
              <div className="h-8 w-8 animate-pulse rounded-full bg-[#FF6F2C]/20" />
              <div className="h-6 w-48 animate-pulse rounded bg-[#F7F7F8]" />
            </div>
            
            {/* Card Fields */}
            <div className="space-y-4">
              {[1, 2, 3].map((fieldNum) => (
                <div key={fieldNum} className="space-y-2">
                  <div className="h-5 w-32 animate-pulse rounded bg-[#F7F7F8]" />
                  <div className="h-12 w-full animate-pulse rounded-xl bg-[#F7F7F8]" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Spinner */}
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-base text-[#6B7280]">Загрузка данных события...</p>
        </div>
      </div>
    </div>
  );
}
