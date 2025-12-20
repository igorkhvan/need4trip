/**
 * EventStatusBadge Component
 * 
 * Централизованная логика определения и отображения статуса события.
 * Единственный источник истины для всех типов карточек событий.
 * 
 * Проверяет (в порядке приоритета):
 * 1. Событие в прошлом
 * 2. Регистрация закрыта вручную
 * 3. Событие скоро начнётся (≤7 дней)
 * 4. Почти заполнено (≥90% участников)
 * 5. Регистрация открыта (по умолчанию)
 * 
 * Used in:
 * - EventCardDetailed (страница /events)
 * - EventCardCompact (homepage, другие списки)
 */

import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Event } from "@/lib/types/event";
import { getDaysUntil } from "@/lib/utils/dates";
import { calculateEventFillPercentage } from "@/components/ui/progress-bar";

export interface EventStatusBadgeProps {
  event: Event;
  size?: "sm" | "md";
}

export function EventStatusBadge({ event, size = "md" }: EventStatusBadgeProps) {
  const daysUntil = getDaysUntil(event.dateTime);
  const fillPercentage = calculateEventFillPercentage(
    event.participantsCount ?? 0,
    event.maxParticipants
  );

  // PRIORITY 1: Проверяем, закрыта ли регистрация
  // (прошлое ИЛИ вручную закрыто владельцем)
  const isPastEvent = daysUntil < 0;
  const isManuallyClosed = event.registrationManuallyClosed;

  if (isPastEvent || isManuallyClosed) {
    return (
      <Badge variant="registration-closed" size={size} className="flex items-center gap-1.5">
        <Lock className="h-3.5 w-3.5" />
        Регистрация закрыта
      </Badge>
    );
  }

  // PRIORITY 2: Событие скоро начнётся (≤7 дней)
  if (daysUntil <= 7 && daysUntil >= 0) {
    return (
      <Badge variant="starting-soon" size={size}>
        Скоро начало
      </Badge>
    );
  }

  // PRIORITY 3: Почти заполнено (≥90%)
  if (fillPercentage >= 90) {
    return (
      <Badge variant="almost-full" size={size}>
        Почти заполнено
      </Badge>
    );
  }

  // По умолчанию: регистрация открыта
  return (
    <Badge variant="registration-open" size={size}>
      Открыта регистрация
    </Badge>
  );
}
