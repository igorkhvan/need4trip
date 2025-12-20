/**
 * EventCardDetailed Component
 * 
 * Расширенная карточка события с детальной информацией.
 * Используется на странице списка всех событий (/events).
 * 
 * Показывает:
 * - Заголовок и категорию
 * - Статус события (EventStatusBadge)
 * - Дату, место, участников, стоимость
 * - Прогресс-бар заполненности
 * - Клик переход на страницу события
 */

import { useRouter } from "next/navigation";
import { Calendar, Clock, MapPin, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressBar, calculateEventFillPercentage } from "@/components/ui/progress-bar";
import { EventStatusBadge } from "@/components/events/event-status-badge";
import { Event } from "@/lib/types/event";
import { getCategoryLabel, getCategoryIcon } from "@/lib/utils/eventCategories";
import { formatDateTimeShort } from "@/lib/utils/dates";

export interface EventCardDetailedProps {
  event: Event;
  onClick?: () => void;
}

export function EventCardDetailed({ event, onClick }: EventCardDetailedProps) {
  const router = useRouter();
  
  const fillPercentage = calculateEventFillPercentage(
    event.participantsCount ?? 0,
    event.maxParticipants
  );
  
  const CategoryIcon = event.category ? getCategoryIcon(event.category) : Users;
  const categoryLabel = event.category ? getCategoryLabel(event.category) : "Событие";
  
  const priceLabel =
    event.isPaid && event.price
      ? `${event.price} ${event.currency?.symbol ?? event.currencyCode ?? ""}`.trim()
      : event.isPaid
        ? "Платное"
        : "Бесплатно";

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(`/events/${event.id}`);
    }
  };

  return (
    <Card
      className="cursor-pointer border-[var(--color-border)] shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
      onClick={handleClick}
    >
      <CardContent className="p-6">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="mb-2 text-2xl font-semibold leading-tight text-[var(--color-text)]">
              {event.title}
            </h3>
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
              <div className="flex items-center gap-1">
                <CategoryIcon className="h-4 w-4" />
                <span>{categoryLabel}</span>
              </div>
              <span>•</span>
              <span>
                {event.ownerHandle
                  ? `@${event.ownerHandle}`
                  : event.ownerName ?? "Организатор"}
              </span>
            </div>
          </div>
          <EventStatusBadge event={event} size="md" />
        </div>

        {/* Info Grid */}
        <div className="mb-4 grid grid-cols-2 gap-4 rounded-xl bg-[var(--color-bg-subtle)] p-4">
          <div>
            <div className="mb-1 text-sm text-[var(--color-text-muted)]">Дата и время</div>
            <div className="flex items-center gap-1 text-base text-[var(--color-text)]">
              <Clock className="h-4 w-4 text-[var(--color-text-muted)]" />
              <span>{formatDateTimeShort(event.dateTime)}</span>
            </div>
          </div>
          <div>
            <div className="mb-1 text-sm text-[var(--color-text-muted)]">Место сбора</div>
            <div className="flex items-center gap-1 text-base text-[var(--color-text)]">
              <MapPin className="h-4 w-4 text-[var(--color-text-muted)]" />
              <span className="truncate">{event.locations[0]?.title || "Не указано"}</span>
            </div>
          </div>
          <div>
            <div className="mb-1 text-sm text-[var(--color-text-muted)]">Участники</div>
            <div className="text-base text-[var(--color-text)]">
              {event.participantsCount ?? 0}
              {event.maxParticipants ? ` / ${event.maxParticipants}` : ""}
            </div>
          </div>
          <div>
            <div className="mb-1 text-sm text-[var(--color-text-muted)]">Стоимость</div>
            <div className="text-base text-[var(--color-text)]">{priceLabel}</div>
          </div>
        </div>

        {/* Progress Bar */}
        {event.maxParticipants && (
          <ProgressBar value={fillPercentage} />
        )}
      </CardContent>
    </Card>
  );
}
