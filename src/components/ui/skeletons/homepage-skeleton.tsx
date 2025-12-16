/**
 * Homepage Skeleton Component
 * 
 * Skeleton для главной страницы при route transitions.
 * Более элегантное решение чем FullPageLoader.
 */

import { UpcomingEventsSkeleton } from "@/app/_components/upcoming-events-skeleton";

export function HomepageSkeleton() {
  return (
    <div className="relative left-1/2 right-1/2 w-screen -ml-[50vw] -mr-[50vw] min-h-screen bg-white text-[#111827]">
      {/* Hero Section Skeleton */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#FF6F2C] to-[#E86223] py-20 md:py-32">
        <div className="page-container relative z-10">
          <div className="mx-auto max-w-4xl text-center text-white">
            <div className="mb-6 h-16 w-3/4 mx-auto animate-pulse rounded-lg bg-white/20" />
            <div className="mb-8 h-6 w-2/3 mx-auto animate-pulse rounded-lg bg-white/20" />
            <div className="flex flex-wrap justify-center gap-4">
              <div className="h-14 w-48 animate-pulse rounded-xl bg-white/30" />
              <div className="h-14 w-48 animate-pulse rounded-xl bg-white/20" />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section Skeleton */}
      <section className="py-20 bg-white">
        <div className="page-container">
          <div className="mb-12 text-center">
            <div className="h-12 w-64 mx-auto mb-4 animate-pulse rounded-lg bg-[#F7F7F8]" />
            <div className="h-6 w-96 mx-auto animate-pulse rounded-lg bg-[#F7F7F8]" />
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center">
                <div className="mb-6 flex justify-center">
                  <div className="h-16 w-16 animate-pulse rounded-2xl bg-[#F7F7F8]" />
                </div>
                <div className="h-6 w-32 mx-auto mb-3 animate-pulse rounded bg-[#F7F7F8]" />
                <div className="h-4 w-full mb-2 animate-pulse rounded bg-[#F7F7F8]" />
                <div className="h-4 w-3/4 mx-auto animate-pulse rounded bg-[#F7F7F8]" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section Skeleton */}
      <section className="py-20 bg-[#F9FAFB]">
        <div className="page-container">
          <div className="mb-12 text-center">
            <div className="h-12 w-80 mx-auto mb-4 animate-pulse rounded-lg bg-white" />
            <div className="h-6 w-96 mx-auto animate-pulse rounded-lg bg-white" />
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl bg-white p-6">
                <div className="mb-4 h-12 w-12 animate-pulse rounded-xl bg-[#F7F7F8]" />
                <div className="h-6 w-32 mb-3 animate-pulse rounded bg-[#F7F7F8]" />
                <div className="h-4 w-full mb-2 animate-pulse rounded bg-[#F7F7F8]" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-[#F7F7F8]" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Events Section Skeleton */}
      <UpcomingEventsSkeleton />
    </div>
  );
}
