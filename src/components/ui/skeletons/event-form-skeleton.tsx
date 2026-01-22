/**
 * EventFormSkeleton
 * 
 * SSOT_EVENTS_UX_V1.1 §1: Skeleton matching the final section layout
 * for dynamic import loading fallback.
 */

/**
 * Section skeleton - matches EventForm card section layout
 */
function SectionSkeleton({ number, rows = 2 }: { number: number; rows?: number }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
      {/* Section header */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-[#FF6F2C] text-xs sm:text-sm font-semibold text-white">
            {number}
          </div>
          <div className="space-y-1.5">
            <div className="h-5 w-48 animate-pulse rounded bg-[#F7F7F8]" />
            <div className="h-4 w-64 animate-pulse rounded bg-[#F7F7F8]" />
          </div>
        </div>
      </div>
      {/* Section content */}
      <div className="p-6 pt-0 space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-[#F7F7F8]" />
              <div className="h-12 w-full animate-pulse rounded-xl border border-[#E5E7EB] bg-[#F7F7F8]" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-[#F7F7F8]" />
              <div className="h-12 w-full animate-pulse rounded-xl border border-[#E5E7EB] bg-[#F7F7F8]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * EventFormSkeleton - matches EventForm layout structure
 */
export function EventFormSkeleton() {
  return (
    <div className="space-y-6 pb-6 sm:pb-10">
      {/* Header */}
      <div className="space-y-4">
        {/* Back button */}
        <div className="h-10 w-20 animate-pulse rounded-lg bg-[#F7F7F8]" />
        <div className="space-y-3">
          {/* Title */}
          <div className="h-10 w-64 animate-pulse rounded bg-[#F7F7F8]" />
          {/* Description */}
          <div className="h-5 w-96 animate-pulse rounded bg-[#F7F7F8]" />
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4 sm:space-y-5">
        {/* Section 1: Basic info */}
        <SectionSkeleton number={1} rows={3} />
        
        {/* Section 2: Locations */}
        <SectionSkeleton number={2} rows={1} />
        
        {/* Section 3: Vehicle */}
        <SectionSkeleton number={3} rows={1} />
        
        {/* Section 4: Rules */}
        <SectionSkeleton number={4} rows={1} />
        
        {/* Section 5: Custom fields */}
        <SectionSkeleton number={5} rows={1} />
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-end gap-3 px-2 pt-2">
        <div className="mr-auto h-5 w-32 animate-pulse rounded bg-[#F7F7F8]" />
        <div className="h-10 w-20 animate-pulse rounded-lg bg-[#F7F7F8]" />
        <div className="h-10 w-40 animate-pulse rounded-lg bg-[#F7F7F8]" />
      </div>
    </div>
  );
}
