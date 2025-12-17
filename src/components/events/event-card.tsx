import Link from "next/link";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Event } from "@/lib/types/event";
import { getCategoryLabel, getCategoryBadgeVariant } from "@/lib/utils/eventCategories";
import { formatDateTimeShort } from "@/lib/utils/dates";

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  // Проверяем, прошло ли событие
  const isPastEvent = new Date(event.dateTime) < new Date();
  
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span>{event.title}</span>
          {event.category && (
            <Badge variant={getCategoryBadgeVariant(event.category)} size="sm">
              {getCategoryLabel(event.category)}
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="flex flex-wrap gap-3 text-sm">
          <span>🗓 {formatDateTimeShort(event.dateTime)}</span>
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
        {isPastEvent ? (
          <Badge variant="neutral" size="sm" className="flex items-center gap-1.5">
            <Lock className="h-3 w-3" />
            Регистрация закрыта
          </Badge>
        ) : (
          <div className="text-xs text-muted-foreground">
            Обновлено {new Date(event.updatedAt).toLocaleDateString("ru-RU")}
          </div>
        )}
        <Button asChild variant="secondary" size="sm">
          <Link href={`/events/${event.id}`}>Подробнее</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
