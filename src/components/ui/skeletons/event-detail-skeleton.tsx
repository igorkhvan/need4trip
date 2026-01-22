/**
 * EventDetailSkeleton Component
 * 
 * Skeleton для страницы детали события /events/[id].
 * SSOT_UI_ASYNC_PATTERNS — page shell renders immediately, skeleton for data sections.
 * SSOT_UI_STRUCTURE — static page chrome visible immediately.
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * EventDetailHeaderSkeleton - шапка с заголовком и бейджами
 */
export function EventDetailHeaderSkeleton() {
  return (
    <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
      <div className="flex-1">
        {/* Title */}
        <div className="mb-4">
          <div className="h-9 w-3/4 animate-pulse rounded bg-[#F7F7F8]" />
        </div>

        {/* Badges */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="h-6 w-20 animate-pulse rounded-full bg-[#F7F7F8]" />
          <div className="h-6 w-24 animate-pulse rounded-full bg-[#F7F7F8]" />
          <div className="h-6 w-28 animate-pulse rounded-full bg-[#F7F7F8]" />
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-5 w-5 animate-pulse rounded bg-[#F7F7F8]" />
              <div className="h-4 w-32 animate-pulse rounded bg-[#F7F7F8]" />
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row md:flex-col md:w-auto">
        <div className="h-10 w-40 animate-pulse rounded-xl bg-[#F7F7F8]" />
      </div>
    </div>
  );
}

/**
 * EventDetailProgressSkeleton - прогресс-бар заполненности
 */
export function EventDetailProgressSkeleton() {
  return (
    <div className="mb-8 space-y-2">
      <div className="h-4 w-32 animate-pulse rounded bg-[#F7F7F8]" />
      <div className="h-2 w-full animate-pulse rounded-full bg-[#F7F7F8]" />
    </div>
  );
}

/**
 * EventDetailCardSkeleton - skeleton карточки секции
 */
export function EventDetailCardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <Card>
      <CardHeader>
        <div className="h-7 w-48 animate-pulse rounded bg-[#F7F7F8]" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div 
            key={i} 
            className="h-4 animate-pulse rounded bg-[#F7F7F8]" 
            style={{ width: `${100 - i * 15}%` }}
          />
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * EventDetailSidebarCardSkeleton - skeleton карточки в сайдбаре
 */
export function EventDetailSidebarCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-36 animate-pulse rounded bg-[#F7F7F8]" />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="h-8 w-24 animate-pulse rounded bg-[#F7F7F8]" />
        <div className="h-4 w-20 animate-pulse rounded bg-[#F7F7F8]" />
      </CardContent>
    </Card>
  );
}

/**
 * EventDetailSkeleton - полный skeleton страницы детали события
 * 
 * Соответствует структуре /events/[id]/page.tsx:
 * - Back button
 * - Header section
 * - Progress bar
 * - Main content grid (left: description, rules, participants; right: price, locations, vehicle, organizer)
 */
export function EventDetailSkeleton() {
  return (
    <div>
      {/* Back button */}
      <div className="mb-6 h-10 w-40 animate-pulse rounded bg-[#F7F7F8]" />

      {/* Header Section */}
      <EventDetailHeaderSkeleton />

      {/* Progress Bar */}
      <EventDetailProgressSkeleton />

      {/* Main Content Grid */}
      <div className="grid gap-6 pb-24 lg:grid-cols-[2fr,1fr] lg:pb-0">
        {/* Left Column */}
        <div className="min-w-0 space-y-6">
          {/* Description Card */}
          <EventDetailCardSkeleton lines={5} />
          
          {/* Rules Card */}
          <EventDetailCardSkeleton lines={3} />
          
          {/* Participants Card */}
          <Card>
            <CardHeader>
              <div className="h-7 w-32 animate-pulse rounded bg-[#F7F7F8]" />
              <div className="mt-2 h-4 w-24 animate-pulse rounded bg-[#F7F7F8]" />
            </CardHeader>
            <CardContent>
              {/* Table skeleton */}
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="h-8 w-8 animate-pulse rounded-full bg-[#F7F7F8]" />
                    <div className="h-4 w-32 animate-pulse rounded bg-[#F7F7F8]" />
                    <div className="ml-auto h-4 w-20 animate-pulse rounded bg-[#F7F7F8]" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="min-w-0 space-y-6">
          {/* Price Card */}
          <EventDetailSidebarCardSkeleton />
          
          {/* Locations Card */}
          <Card>
            <CardHeader>
              <div className="h-6 w-32 animate-pulse rounded bg-[#F7F7F8]" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="h-6 w-6 animate-pulse rounded bg-[#F7F7F8]" />
                  <div className="flex-1 space-y-1">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-[#F7F7F8]" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-[#F7F7F8]" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          
          {/* Vehicle Requirements Card */}
          <EventDetailSidebarCardSkeleton />
          
          {/* Organizer Card */}
          <EventDetailSidebarCardSkeleton />
        </div>
      </div>
    </div>
  );
}
