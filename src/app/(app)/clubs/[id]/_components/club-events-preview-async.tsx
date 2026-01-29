/**
 * ClubEventsPreviewAsync Component
 * 
 * Async server component for Events Preview section.
 * Per Visual Contract v6 §9: Read-only preview.
 * 
 * Displays: upcoming events.
 * No creation or edit controls.
 * 
 * Architecture (ADR-001.4):
 * - RSC calls service layer DIRECTLY (no HTTP API)
 * - Receives currentUser from parent page (auth already resolved)
 * - Avoids middleware x-user-id stripping issue on public routes
 * - Uses SSOT §4.5 visibility rules via listVisibleEventsForUserPaginated
 */

import { Calendar, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { listVisibleEventsForUserPaginated } from "@/lib/services/events";
import type { CurrentUser } from "@/lib/auth/currentUser";
import { log } from "@/lib/utils/logger";

interface EventPreview {
  id: string;
  title: string;
  dateTime: string;
  city?: { id: string; name: string; countryCode: string } | null;
  participantsCount: number;
  maxParticipants: number;
}

/**
 * Fetch club events directly from service layer (no HTTP API).
 * 
 * This bypasses the HTTP API to avoid middleware stripping x-user-id
 * on public routes. Service layer correctly implements SSOT §4.5.
 */
async function getClubEvents(
  clubId: string,
  currentUser: CurrentUser | null
): Promise<EventPreview[]> {
  try {
    const result = await listVisibleEventsForUserPaginated(
      {
        filters: {
          tab: 'upcoming',
          clubId,
        },
        sort: { sort: 'date' },
        pagination: { page: 1, limit: 3 },
      },
      currentUser
    );
    
    // Map to EventPreview format with safe defaults
    return result.events.map(event => ({
      id: event.id,
      title: event.title,
      dateTime: event.dateTime,
      city: event.city ?? null,
      participantsCount: event.participantsCount ?? 0,
      maxParticipants: event.maxParticipants ?? 0,
    }));
  } catch (err) {
    log.errorWithStack("ClubEventsPreviewAsync: Failed to load events", err, { clubId });
    return [];
  }
}

// Format date for display
function formatEventDate(dateTime: string): string {
  const date = new Date(dateTime);
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface ClubEventsPreviewAsyncProps {
  clubId: string;
  currentUser: CurrentUser | null;
}

export async function ClubEventsPreviewAsync({ clubId, currentUser }: ClubEventsPreviewAsyncProps) {
  const events = await getClubEvents(clubId, currentUser);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-[18px] font-semibold text-[var(--color-text)]">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <span>Предстоящие события</span>
      </h2>
      
      {events.length === 0 ? (
        // Empty placeholder per Visual Contract v6 §9
        <p className="text-[15px] text-muted-foreground italic">
          У клуба пока нет предстоящих событий
        </p>
      ) : (
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
                    {formatEventDate(event.dateTime)}
                  </span>
                  {event.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {event.city.name}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {event.participantsCount}/{event.maxParticipants}
                  </span>
                </div>
              </div>

              {/* Status badge */}
              {event.participantsCount >= event.maxParticipants ? (
                <Badge variant="registration-closed" size="sm" className="self-center">
                  Мест нет
                </Badge>
              ) : (
                <Badge variant="registration-open" size="sm" className="self-center">
                  Открыто
                </Badge>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
