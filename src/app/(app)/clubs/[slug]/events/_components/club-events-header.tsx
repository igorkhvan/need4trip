/**
 * ClubEventsHeader Component
 * 
 * Header section for Club Events page.
 * Per Visual Contract v1 — EVENTS §4.2: Blocking render.
 * 
 * Shows: 
 * - Page title "Events"
 * - Create Event button (owner/admin only)
 * 
 * MUST NOT show: inline editing, role inference
 */

import Link from "next/link";
import { Plus, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ClubRole } from "@/lib/types/club";

interface ClubEventsHeaderProps {
  clubId: string;
  clubName: string;
  userRole: ClubRole | null;
  isArchived: boolean;
}

export function ClubEventsHeader({
  clubId,
  clubName,
  userRole,
  isArchived,
}: ClubEventsHeaderProps) {
  // Per Visual Contract v1 — EVENTS §4.2:
  // Owner/Admin: Create button visible
  // Member: Create button hidden
  const canCreate = userRole === "owner" || userRole === "admin";

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-[var(--color-text)] md:text-3xl">
            События клуба
          </h1>
          <p className="text-[14px] text-muted-foreground">
            {clubName}
          </p>
        </div>

        {/* Create Event button - per Visual Contract v1 — EVENTS §4.2 */}
        {canCreate && (
          isArchived ? (
            // Archived: Button disabled with tooltip
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      disabled
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Создать событие</span>
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Клуб в архиве — создание событий недоступно</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            // Active: Link to create event page
            <Button asChild className="flex items-center gap-2">
              <Link href={`/events/create?clubId=${clubId}`}>
                <Plus className="h-4 w-4" />
                <span>Создать событие</span>
              </Link>
            </Button>
          )
        )}
      </div>
    </div>
  );
}
