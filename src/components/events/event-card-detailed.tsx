/**
 * EventCardDetailed Component
 * 
 * Расширенная карточка события с детальной информацией.
 * Используется на странице списка всех событий (/events).
 * 
 * Показывает:
 * - Заголовок и категорию (с правильной иконкой)
 * - Статус события (EventStatusBadge) — для всех типов DTO
 * - Организатор (имя или @handle)
 * - Дату, город, участников, стоимость
 * - Клубный бейдж (если клубное событие)
 * - Превью описания (plain text, 2 строки)
 * - Прогресс-бар заполненности
 * - Клик переход на страницу события
 */

import { useRouter } from "next/navigation";
import { Clock, MapPin, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

/**
 * Strip HTML tags and truncate to plain text preview
 */
function getDescriptionPreview(html: string, maxLength = 120): string {
  // Remove HTML tags
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "...";
}

export function EventCardDetailed({ event, onClick }: EventCardDetailedProps) {
  const router = useRouter();
  
  const fillPercentage = calculateEventFillPercentage(
    event.participantsCount ?? 0,
    event.maxParticipants
  );
  
  // Detect event type
  const hasFullEvent = 'locations' in event;

  // Category icon — works for both full Event and lightweight DTO
  const CategoryIcon = event.category
    ? getCategoryIcon(
        hasFullEvent
          ? (event.category as any) // Full Event: EventCategoryDto
          : (event.category as { icon: string }).icon // Lightweight: use icon string
      )
    : getCategoryIcon(null);
  
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

  // City name (full Event uses locations[0].title, lightweight uses city.name)
  const cityText = hasFullEvent
    ? ((event as Event).city?.name || (event as Event).locations?.[0]?.title || "Не указано")
    : (event.city?.name || "Не указано");

  // Owner info — works for both full Event and lightweight DTO
  const ownerInfo = (() => {
    if (hasFullEvent && 'ownerHandle' in event) {
      return event.ownerHandle ? `@${event.ownerHandle}` : event.ownerName ?? "Организатор";
    }
    // Lightweight DTO: ownerHandle / ownerName are hydrated fields
    if ('ownerHandle' in event && event.ownerHandle) {
      return `@${event.ownerHandle}`;
    }
    if ('ownerName' in event && event.ownerName) {
      return event.ownerName as string;
    }
    return "Организатор";
  })();

  // Club info — works for both full Event and lightweight DTO
  const clubName = (() => {
    if (hasFullEvent && 'club' in event && (event as Event).club) {
      return (event as Event).club!.name;
    }
    if ('clubName' in event && event.clubName) {
      return event.clubName as string;
    }
    return null;
  })();

  // Description preview (plain text, 2 lines)
  const descriptionPreview = event.description
    ? getDescriptionPreview(event.description)
    : null;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(`/events/${event.slug}`);
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
          <EventStatusBadge event={event} size="md" />
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
            <div className="mb-1 text-sm text-muted-foreground">Город</div>
            <div className="flex items-center gap-1 text-base text-[var(--color-text)]">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{cityText}</span>
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

        {/* Club badge */}
        {clubName && (
          <div className="mb-3">
            <Badge variant="outline" className="inline-flex items-center gap-1.5 text-xs">
              <Building2 className="h-3 w-3" />
              {clubName}
            </Badge>
          </div>
        )}

        {/* Description preview */}
        {descriptionPreview && (
          <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
            {descriptionPreview}
          </p>
        )}

        {/* Progress Bar */}
        {event.maxParticipants && (
          <ProgressBar value={fillPercentage} />
        )}
      </CardContent>
    </Card>
  );
}
