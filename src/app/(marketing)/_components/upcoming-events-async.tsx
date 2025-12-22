/**
 * UpcomingEventsAsync Component
 * 
 * Async компонент для загрузки предстоящих событий на homepage.
 * Используется внутри Suspense boundary для параллельной загрузки.
 */

import { getCurrentUserSafe } from "@/lib/auth/currentUser";
import { listVisibleEventsForUser } from "@/lib/services/events";
import { EventCardCompact } from "@/components/events/event-card-compact";
import { isVisibleOnHomepage } from "@/lib/utils/eventVisibility";

export async function UpcomingEventsAsync() {
  // Загружаем события
  const currentUser = await getCurrentUserSafe();
  const eventsData = await listVisibleEventsForUser(currentUser?.id ?? null);
  
  // Фильтруем только предстоящие события для homepage
  // Homepage = витрина для всех (public события + свои события для владельцев)
  const now = new Date();
  const upcomingPublicEvents = eventsData
    .filter((e) => {
      const eventDate = new Date(e.dateTime);
      return isVisibleOnHomepage(e, currentUser) && eventDate >= now;
    })
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
    .slice(0, 3);

  // Если нет событий - показываем заглушку
  if (upcomingPublicEvents.length === 0) {
    return (
      <section className="page-container py-24 md:py-32">
        <div className="mb-16 text-center">
          <h2 className="heading-section mb-4">Предстоящие поездки</h2>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground md:text-lg">
            Новые события появятся здесь в ближайшее время
          </p>
        </div>
      </section>
    );
  }

  // Рендерим события с использованием EventCardCompact
  return (
    <section className="page-container py-24 md:py-32">
      <div className="mb-16 text-center">
        <h2 className="heading-section mb-4">Предстоящие поездки</h2>
        <p className="mx-auto max-w-2xl text-base text-muted-foreground md:text-lg">
          Присоединяйтесь к ближайшим автомобильным событиям
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {upcomingPublicEvents.map((event) => (
          <EventCardCompact key={event.id} event={event} />
        ))}
      </div>
    </section>
  );
}
