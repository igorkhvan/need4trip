/**
 * ClubProfileHeader Component
 * 
 * Header section for Club Profile page.
 * Per Visual Contract v6 §3: Part of fixed page structure.
 * Data source: GET /api/clubs/[id] (API-016)
 * 
 * Shows: Club name, visibility badge, archived badge, basic meta.
 * No edit affordances, no management controls.
 */

import Link from "next/link";
import { MapPin, Users, Calendar, Send, Globe, Archive, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CityHydrated } from "@/lib/types/city";

interface ClubProfileHeaderProps {
  club: {
    id: string;
    name: string;
    logoUrl: string | null;
    visibility?: "public" | "private";
    archivedAt: string | null;
    cities?: CityHydrated[];
    memberCount: number;
    upcomingEventCount: number;
    telegramUrl: string | null;
    websiteUrl: string | null;
  };
  /** P0 FIX: Owner/Admin entry points inline in header */
  isOwnerOrAdmin?: boolean;
  isArchived?: boolean;
}

export function ClubProfileHeader({ club, isOwnerOrAdmin = false, isArchived: isArchivedProp }: ClubProfileHeaderProps) {
  const isArchived = isArchivedProp ?? !!club.archivedAt;
  const isPrivate = club.visibility === "private";

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
      <div className="flex items-start gap-6">
        {/* Logo */}
        {club.logoUrl ? (
          <img
            src={club.logoUrl}
            alt={club.name}
            className="h-24 w-24 flex-shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-hover)] text-3xl font-bold text-white">
            {club.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1">
          {/* Title row with badges */}
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-[var(--color-text)] md:text-4xl">
              {club.name}
            </h1>
            
            {/* Visibility badge */}
            <Badge variant={isPrivate ? "neutral" : "success"} size="sm">
              {isPrivate ? "Закрытый" : "Открытый"}
            </Badge>
            
            {/* Archived badge - per Visual Contract v6 §4 */}
            {isArchived && (
              <Badge variant="danger" size="sm" className="flex items-center gap-1">
                <Archive className="h-3 w-3" />
                <span>В архиве</span>
              </Badge>
            )}
          </div>

          {/* Meta information */}
          <div className="flex flex-wrap gap-4 text-[14px] text-muted-foreground">
            {club.cities && club.cities.length > 0 && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span>
                  {club.cities.length === 1
                    ? club.cities[0].region
                      ? `${club.cities[0].name}, ${club.cities[0].region}`
                      : club.cities[0].name
                    : `${club.cities.length} городов`}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>{club.memberCount} участников</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{club.upcomingEventCount} предстоящих</span>
            </div>
          </div>

          {/* External links */}
          {(club.telegramUrl || club.websiteUrl) && (
            <div className="mt-4 flex gap-3">
              {club.telegramUrl && (
                <a
                  href={club.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2 text-[14px] text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg-subtle)]"
                >
                  <Send className="h-4 w-4" />
                  <span>Telegram</span>
                </a>
              )}
              {club.websiteUrl && (
                <a
                  href={club.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2 text-[14px] text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg-subtle)]"
                >
                  <Globe className="h-4 w-4" />
                  <span>Сайт</span>
                </a>
              )}
            </div>
          )}

          {/* P0 FIX: Owner/Admin Entry Points - inline inside Header zone */}
          {isOwnerOrAdmin && !isArchived && (
            <div className="mt-4 flex flex-wrap gap-4 border-t border-[var(--color-border)] pt-4">
              <Link
                href={`/clubs/${club.id}/members`}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-[var(--color-text)]"
              >
                <Users className="h-4 w-4" />
                <span>Управление участниками</span>
              </Link>
              <Link
                href={`/clubs/${club.id}/settings`}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-[var(--color-text)]"
              >
                <Settings className="h-4 w-4" />
                <span>Настройки клуба</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
