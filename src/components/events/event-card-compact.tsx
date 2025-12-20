/**
 * EventCardCompact Component
 * 
 * Компактная вертикальная карточка события.
 * Используется на homepage и в компактных списках.
 * 
 * Показывает:
 * - Заголовок события
 * - EventAccessBadge (тип доступа) — унифицированный размер
 * - Категория
 * - Дата и количество участников
 * - Статус регистрации в футере
 * - Кнопка "Подробнее"
 */

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
import { EventAccessBadge } from "@/components/events/event-access-badge";
import { Event } from "@/lib/types/event";
import { getCategoryLabel, getCategoryBadgeVariant } from "@/lib/utils/eventCategories";
import { formatDateTimeShort } from "@/lib/utils/dates";

export interface EventCardCompactProps {
  event: Event;
}

export function EventCardCompact({ event }: EventCardCompactProps) {
  // Проверяем, закрыта ли регистрация
  // Упрощённая проверка без participantsCount (чтобы избежать JOIN для каждой карточки):
  // - Событие в прошлом
  // - Владелец вручную закрыл регистрацию
  // Проверка лимита участников выполняется только на странице деталей события
  const isPastEvent = new Date(event.dateTime) < new Date();
  const isClosedManually = event.registrationManuallyClosed;
  const isRegistrationClosed = isPastEvent || isClosedManually;
  
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2 flex-1">
            <span className="line-clamp-2">{event.title}</span>
            <EventAccessBadge event={event} variant="compact" size="sm" />
          </div>
          {event.category && (
            <Badge variant={getCategoryBadgeVariant(event.category)} size="sm" className="self-start sm:self-auto sm:shrink-0">
              {getCategoryLabel(event.category)}
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="flex flex-wrap gap-3 text-sm">
          <span>🗓 {formatDateTimeShort(event.dateTime)}</span>
          
          {event.maxParticipants && (
            <span>👥 До {event.maxParticipants} экипажей</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex items-center justify-between">
        {isRegistrationClosed ? (
          <Badge variant="registration-closed" size="sm" className="flex items-center gap-1.5">
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
