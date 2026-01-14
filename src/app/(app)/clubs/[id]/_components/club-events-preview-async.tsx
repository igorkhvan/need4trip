/**
 * ClubEventsPreviewAsync Component
 * 
 * Async server component for Events Preview section.
 * Per Visual Contract v2 §5.5: Progressive render.
 * Data source: GET /api/events?club_id=...
 * 
 * If zero events → render empty placeholder.
 */

import { Calendar, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface EventPreview {
  id: string;
  title: string;
  dateTime: string;
  city?: { name: string } | null;
  participantsCount: number;
  maxParticipants: number;
}

// Fetch club events from API
async function getClubEvents(clubId: string): Promise<EventPreview[] | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(
      `${baseUrl}/api/events?clubId=${clubId}&tab=upcoming&limit=3`,
      { cache: "no-store" }
    );
    
    if (!res.ok) {
      return null;
    }
    
    const json = await res.json();
    return json.events || [];
  } catch {
    return null;
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
}

export async function ClubEventsPreviewAsync({ clubId }: ClubEventsPreviewAsyncProps) {
  const events = await getClubEvents(clubId);
  
  // If fetch failed, still show section with empty state
  const eventsList = events || [];

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-[18px] font-semibold text-[var(--color-text)]">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <span>Предстоящие события</span>
      </h2>
      
      {eventsList.length === 0 ? (
        // Empty placeholder per Visual Contract v2 §5.5
        <p className="text-[15px] text-muted-foreground italic">
          У клуба пока нет предстоящих событий
        </p>
      ) : (
        <div className="space-y-3">
          {eventsList.map((event) => (
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
