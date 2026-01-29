/**
 * ClubMembersPreviewAsync Component
 * 
 * Async server component for Members Preview section.
 * Per Visual Contract v6 §8: Read-only preview.
 * 
 * Displays: avatars, total count.
 * No role badges, no management controls.
 * 
 * Per ADR-001.5: RSC MUST call service-layer functions directly.
 * Auth is resolved once per page and passed explicitly to service.
 */

import { Users, Crown } from "lucide-react";
import { getClubMembersPreview } from "@/lib/services/clubs";
import type { CurrentUser } from "@/lib/auth/currentUser";

interface ClubMembersPreviewAsyncProps {
  clubId: string;
  currentUser: CurrentUser | null;
}

/**
 * Per ADR-001.5: currentUser is resolved once at the page level
 * and passed explicitly to this RSC component.
 */
export async function ClubMembersPreviewAsync({ clubId, currentUser }: ClubMembersPreviewAsyncProps) {
  // ADR-001.5: Call service-layer function directly (no HTTP API)
  const data = await getClubMembersPreview(clubId, currentUser);
  
  // Per Visual Contract v6 §8: If API not accessible → hide entire section
  if (!data) {
    return null;
  }

  const { members, totalCount, hasMore } = data;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-[18px] font-semibold text-[var(--color-text)]">
        <Users className="h-5 w-5 text-muted-foreground" />
        <span>Участники</span>
        <span className="text-muted-foreground font-normal">({totalCount})</span>
      </h2>
      
      {members.length === 0 ? (
        // Empty placeholder per Visual Contract v6 §8
        <p className="text-[15px] text-muted-foreground italic">
          В клубе пока нет участников
        </p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {members.map((member, index) => (
            <div key={index} className="flex flex-col items-center gap-2">
              {/* Avatar */}
              <div className="relative">
                {member.avatarUrl ? (
                  <img
                    src={member.avatarUrl}
                    alt={member.displayName}
                    className="h-12 w-12 rounded-full object-cover border-2 border-[var(--color-border)]"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-hover)] text-white text-sm font-semibold border-2 border-white shadow">
                    {member.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                
                {/* Owner badge */}
                {member.isOwner && (
                  <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-warning)] text-white shadow">
                    <Crown className="h-3 w-3" />
                  </div>
                )}
              </div>
              
              {/* Name */}
              <span className="text-xs text-muted-foreground max-w-[80px] truncate text-center">
                {member.displayName}
              </span>
            </div>
          ))}
          
          {/* "More" indicator */}
          {hasMore && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-bg-subtle)] text-muted-foreground text-sm font-medium">
                +{totalCount - members.length}
              </div>
              <span className="text-xs text-muted-foreground">ещё</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
