/**
 * ClubMembersPreviewAsync Component
 * 
 * Async server component for Members Preview section.
 * Per Visual Contract v2 §5.4: Progressive render.
 * Data source: GET /api/clubs/[id]/members/preview (API-053)
 * 
 * If API not accessible → hide entire section.
 * If zero members → render empty placeholder.
 */

import { Users, Crown } from "lucide-react";

// Fetch members preview from API-053
async function getMembersPreview(clubId: string): Promise<{
  members: Array<{
    displayName: string;
    avatarUrl: string | null;
    isOwner?: boolean;
    userId?: string;
    role?: string;
  }>;
  totalCount: number;
  hasMore: boolean;
} | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/clubs/${clubId}/members/preview`, {
      cache: "no-store",
    });
    
    if (!res.ok) {
      // If 403 or other error, return null to hide section
      return null;
    }
    
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

interface ClubMembersPreviewAsyncProps {
  clubId: string;
}

export async function ClubMembersPreviewAsync({ clubId }: ClubMembersPreviewAsyncProps) {
  const data = await getMembersPreview(clubId);
  
  // Per Visual Contract v2 §5.4: If API not accessible → hide entire section
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
        // Empty placeholder per Visual Contract v2 §5.4
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
                  <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#F59E0B] text-white shadow">
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
