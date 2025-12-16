/**
 * UpcomingEventsAsync Component
 * 
 * Async компонент для загрузки предстоящих событий на homepage.
 * Используется внутри Suspense boundary для параллельной загрузки.
 */

import Link from "next/link";
import { Calendar, MapPin, Users } from "lucide-react";
import { getCurrentUserSafe } from "@/lib/auth/currentUser";
import { listVisibleEventsForUser } from "@/lib/services/events";
import { getCategoryLabel } from "@/lib/utils/eventCategories";
import { formatDate } from "@/lib/utils/dates";

type EventSummary = {
  id: string;
  title: string;
  startsAt: string;
  typeLabel?: string | null;
  description?: string | null;
  participantsCount?: number | null;
  maxParticipants?: number | null;
};

export async function UpcomingEventsAsync() {
  // Загружаем события
  const currentUser = await getCurrentUserSafe();
  const eventsData = await listVisibleEventsForUser(currentUser?.id ?? null);
  
  // Фильтруем только предстоящие публичные (для homepage)
  const now = new Date();
  const upcomingPublicEvents = eventsData
    .filter((e) => {
      const eventDate = new Date(e.dateTime);
      return e.visibility === "public" && eventDate >= now;
    })
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
    .slice(0, 3);
  
  const events: EventSummary[] = upcomingPublicEvents.map((e) => ({
    id: e.id,
    title: e.title,
    startsAt: e.dateTime,
    typeLabel: e.category ? getCategoryLabel(e.category) : "Событие",
    description: e.description ?? null,
    participantsCount: e.participantsCount ?? null,
    maxParticipants: e.maxParticipants ?? null,
  }));

  // Если нет событий - показываем заглушку
  if (events.length === 0) {
    return (
      <section className="page-container py-24 md:py-32">
        <div className="mb-16 text-center">
          <h2 className="heading-section mb-4">Предстоящие поездки</h2>
          <p className="mx-auto max-w-2xl text-base text-[#6B7280] md:text-lg">
            Новые события появятся здесь в ближайшее время
          </p>
        </div>
      </section>
    );
  }

  // Рендерим события
  return (
    <section className="page-container py-24 md:py-32">
      <div className="mb-16 text-center">
        <h2 className="heading-section mb-4">Предстоящие поездки</h2>
        <p className="mx-auto max-w-2xl text-base text-[#6B7280] md:text-lg">
          Присоединяйтесь к ближайшим автомобильным событиям
        </p>
      </div>

      {events.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="group overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex h-full flex-col p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6F2C] to-[#E86223]">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  {event.typeLabel && (
                    <span className="rounded-full bg-[#FFF4EF] px-3 py-1 text-xs font-medium text-[#FF6F2C]">
                      {event.typeLabel}
                    </span>
                  )}
                </div>
                
                <h3 className="mb-3 text-xl font-semibold text-[#111827] group-hover:text-[var(--color-primary)]">
                  {event.title}
                </h3>
                
                <div className="mb-4 flex items-center gap-4 text-sm text-[#6B7280]">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(event.startsAt)}</span>
                  </span>
                  {event.participantsCount !== null && (
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>
                        {event.participantsCount}
                        {event.maxParticipants ? `/${event.maxParticipants}` : ""}
                      </span>
                    </span>
                  )}
                </div>
                
                {event.description && (
                  <p className="mb-4 line-clamp-2 flex-1 text-sm text-[#6B7280]">
                    {event.description}
                  </p>
                )}
                
                <div className="text-sm font-medium text-[var(--color-primary)] group-hover:underline">
                  Подробнее →
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
