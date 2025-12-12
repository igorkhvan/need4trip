import { EventsGrid } from "@/components/events/events-grid";
import { listVisibleEventsForUser } from "@/lib/services/events";
import { getCurrentUserSafe } from "@/lib/auth/currentUser";
import { MapPin } from "lucide-react";

interface EventsPageProps {
  searchParams?: { city?: string };
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const currentUser = await getCurrentUserSafe();
  const allEvents = await listVisibleEventsForUser(currentUser?.id ?? null);
  
  // Фильтрация по городу
  const cityFilter = searchParams?.city;
  const events = cityFilter
    ? allEvents.filter(event => 
        event.city?.name?.toLowerCase() === cityFilter.toLowerCase()
      )
    : allEvents;

  // Получить список уникальных городов
  const cityNames = Array.from(new Set(
    allEvents
      .map(e => e.city?.name)
      .filter((c): c is string => c !== null && c !== undefined && c.trim() !== "")
  )).sort();

  return (
    <div className="page-container py-12">
      {/* Фильтр по городам */}
      {cityNames.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Фильтр по городу:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/events"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !cityFilter
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Все города ({allEvents.length})
            </a>
            {cityNames.map((cityName) => {
              const count = allEvents.filter(e => e.city?.name === cityName).length;
              return (
                <a
                  key={cityName}
                  href={`/events?city=${encodeURIComponent(cityName)}`}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    cityFilter === cityName
                      ? "bg-primary-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {cityName} ({count})
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Результаты */}
      {cityFilter && (
        <div className="mb-4 text-sm text-gray-600">
          Найдено событий в городе <span className="font-semibold">{cityFilter}</span>: {events.length}
        </div>
      )}

      <EventsGrid events={events} currentUserId={currentUser?.id ?? null} />
    </div>
  );
}
