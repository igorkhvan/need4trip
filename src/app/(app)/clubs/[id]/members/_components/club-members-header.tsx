/**
 * ClubMembersHeader Component
 * 
 * Header section for Club Members page.
 * Per Visual Contract v4 §4: Blocking render.
 * Data source: GET /api/clubs/[id] (API-016)
 * 
 * Shows: Club name, visibility badge, archived badge
 * MUST NOT show: actions, buttons, menus (per Visual Contract v4 §4)
 */

import { Archive } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ClubMembersHeaderProps {
  club: {
    name: string;
    visibility?: "public" | "private";
    archivedAt: string | null;
  };
}

export function ClubMembersHeader({ club }: ClubMembersHeaderProps) {
  const isArchived = !!club.archivedAt;
  const isPrivate = club.visibility === "private";

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-[var(--color-text)] md:text-3xl">
          {club.name}
        </h1>
        
        {/* Visibility badge */}
        <Badge variant={isPrivate ? "neutral" : "success"} size="sm">
          {isPrivate ? "Закрытый" : "Открытый"}
        </Badge>
        
        {/* Archived badge - per Visual Contract v4 §7 */}
        {isArchived && (
          <Badge variant="danger" size="sm" className="flex items-center gap-1">
            <Archive className="h-3 w-3" />
            <span>В архиве</span>
          </Badge>
        )}
      </div>
      
      <p className="mt-2 text-[14px] text-muted-foreground">
        Участники клуба
      </p>
    </div>
  );
}
