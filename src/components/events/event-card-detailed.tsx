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
import { EventListItemHydrated } from "@/lib/services/events";
import { getCategoryLabel, getCategoryIcon } from "@/lib/utils/eventCategories";
import { formatDateTimeShort } from "@/lib/utils/dates";
import { formatEventPrice } from "@/lib/utils/eventFormatters";

export interface EventCardDetailedProps {
  event: Event | EventListItemHydrated; // Support both full event and lightweight listing DTO
  onClick?: () => void;
}

export function EventCardDetailed({ event, onClick }: EventCardDetailedProps) {
  const router = useRouter();
  
  const fillPercentage = calculateEventFillPercentage(
    event.participantsCount ?? 0,
    event.maxParticipants
  );
  
  // Handle category (full Event has EventCategoryDto, lightweight has { id, name, icon })
  const hasFullEvent = 'locations' in event;
  const CategoryIcon = event.category 
    ? (hasFullEvent ? getCategoryIcon(event.category as any) : Users)
    : Users;
  const categoryLabel = event.category 
    ? (hasFullEvent 
        ? getCategoryLabel(event.category as any) 
        : ('name' in event.category ? event.category.name : "Событие"))
    : "Событие";
  
  // Format price (lightweight DTO has priceAmount/priceCurrency instead of nested objects)
  const priceLabel = hasFullEvent 
    ? formatEventPrice(event as Event)
    : (event.isPaid 
        ? (event.priceAmount && event.priceCurrency 
            ? `${event.priceAmount} ${event.priceCurrency}` 
            : "Платно")
        : "Бесплатно");

  // Extract location text (handle both full Event and lightweight EventListItemHydrated)
  const locationText = hasFullEvent
    ? ((event as Event).locations?.[0]?.title || "Не указано")
    : ('locationText' in event ? event.locationText : "Не указано");

  // Owner info (only available in full Event)
  const ownerInfo = hasFullEvent && 'ownerHandle' in event
    ? (event.ownerHandle ? `@${event.ownerHandle}` : event.ownerName ?? "Организатор")
    : "Организатор";

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
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <CategoryIcon className="h-4 w-4" />
                <span>{categoryLabel}</span>
              </div>
              <span>•</span>
              <span>{ownerInfo}</span>
            </div>
          </div>
          {hasFullEvent && <EventStatusBadge event={event as Event} size="md" />}
        </div>

        {/* Info Grid */}
        <div className="mb-4 grid grid-cols-2 gap-4 rounded-xl bg-[var(--color-bg-subtle)] p-4">
          <div>
            <div className="mb-1 text-sm text-muted-foreground">Дата и время</div>
            <div className="flex items-center gap-1 text-base text-[var(--color-text)]">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{formatDateTimeShort(event.dateTime)}</span>
            </div>
          </div>
          <div>
            <div className="mb-1 text-sm text-muted-foreground">Место сбора</div>
            <div className="flex items-center gap-1 text-base text-[var(--color-text)]">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{locationText}</span>
            </div>
          </div>
          <div>
            <div className="mb-1 text-sm text-muted-foreground">Участники</div>
            <div className="text-base text-[var(--color-text)]">
              {event.participantsCount ?? 0}
              {event.maxParticipants ? ` / ${event.maxParticipants}` : ""}
            </div>
          </div>
          <div>
            <div className="mb-1 text-sm text-muted-foreground">Стоимость</div>
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
