import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Event, EventCategory } from "@/lib/types/event";

const CATEGORY_LABELS: Record<EventCategory, string> = {
  weekend_trip: "Выезд на выходные",
  technical_ride: "Техническая покатушка",
  meeting: "Встреча",
  training: "Тренировка",
  service_day: "Сервис-день",
  other: "Другое",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span>{event.title}</span>
          {event.category && (
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              {CATEGORY_LABELS[event.category]}
            </span>
          )}
        </CardTitle>
        <CardDescription className="flex flex-wrap gap-3 text-sm">
          <span>🗓 {formatDateTime(event.dateTime)}</span>
          <span>📍 {event.locationText}</span>
          {event.maxParticipants && (
            <span>👥 До {event.maxParticipants} экипажей</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {event.description}
        </p>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Обновлено {new Date(event.updatedAt).toLocaleDateString("ru-RU")}
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link href={`/events/${event.id}`}>Подробнее</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
