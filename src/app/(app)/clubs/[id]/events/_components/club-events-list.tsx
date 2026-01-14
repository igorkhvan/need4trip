/**
 * ClubEventsList Component
 * 
 * List section for Club Events page.
 * Per Visual Contract v1 — EVENTS §4.4: Blocking render.
 * 
 * Shows:
 * - Event cards with: title, startAt, status, participantsCount
 * - Click → navigate to Event Details
 * 
 * MUST NOT show: inline editing, RSVP flows, drag & drop
 */

import Link from "next/link";
import { Calendar, Users, MapPin, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils/dates";
import { getCategoryLabel, getCategoryBadgeVariant } from "@/lib/utils/eventCategories";
import type { Event } from "@/lib/types/event";

interface ClubEventsListProps {
  events: Event[];
}

function getEventStatusBadge(event: Event) {
  const isPastEvent = new Date(event.dateTime) < new Date();
  const isClosedManually = event.registrationManuallyClosed;
  const isFull =
    event.maxParticipants !== null &&
    event.maxParticipants !== undefined &&
    event.participantsCount !== undefined &&
    event.participantsCount >= event.maxParticipants;

  if (isPastEvent) {
    return (
      <Badge variant="neutral" size="sm">
        Завершено
      </Badge>
    );
  }

  if (isClosedManually || isFull) {
    return (
      <Badge variant="registration-closed" size="sm" className="flex items-center gap-1">
        <Lock className="h-3 w-3" />
        Регистрация закрыта
      </Badge>
    );
  }

  return (
    <Badge variant="registration-open" size="sm">
      Открыто
    </Badge>
  );
}

export function ClubEventsList({ events }: ClubEventsListProps) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-[18px] font-semibold text-[var(--color-text)]">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <span>Все события</span>
        <Badge variant="neutral" size="sm" className="ml-2">
          {events.length}
        </Badge>
      </h2>

      <div className="space-y-3">
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="flex gap-4 p-4 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)] transition-colors"
          >
            {/* Date block */}
            <div className="flex flex-col items-center justify-center min-w-[60px] rounded-lg bg-[var(--color-primary-bg)] p-2">
              <span className="text-sm font-bold text-[var(--color-primary)]">
                {new Date(event.dateTime).getDate()}
              </span>
              <span className="text-xs text-[var(--color-primary)] uppercase">
                {new Date(event.dateTime).toLocaleDateString("ru-RU", { month: "short" })}
              </span>
            </div>

            {/* Event info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-[var(--color-text)] truncate">
                {event.title}
              </h3>
              <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDateTime(event.dateTime)}
                </span>
                {event.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {event.city.name}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {event.participantsCount ?? 0}/{event.maxParticipants ?? "∞"}
                </span>
              </div>
              {/* Category badge */}
              {event.category && (
                <div className="mt-2">
                  <Badge variant={getCategoryBadgeVariant(event.category)} size="sm">
                    {getCategoryLabel(event.category)}
                  </Badge>
                </div>
              )}
            </div>

            {/* Status badge */}
            <div className="self-center">
              {getEventStatusBadge(event)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
