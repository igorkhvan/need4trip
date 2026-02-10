/**
 * ClubMembersList Component
 * 
 * Members list section for Club Members page.
 * Per Visual Contract v4 §5: Blocking render.
 * Data source: GET /api/clubs/[id]/members (API-019)
 * 
 * Content per row:
 * - User avatar
 * - Display name
 * - Role label
 * - Joined date
 * 
 * Interaction rules:
 * - Member: Read-only
 * - Admin: Read-only
 * - Owner: May remove member (if not archived)
 * 
 * Archived behavior:
 * - Remove action is disabled
 * - Tooltip: "Клуб в архиве"
 * 
 * B5.3: Billing wiring for Remove member action
 * - 402 PAYWALL errors handled via BillingModalHost
 * - Archived state short-circuits BEFORE billing handling
 */

"use client";

import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserMinus, Loader2 } from "lucide-react";
import { getClubRoleLabel, type ClubRole } from "@/lib/types/club";
import { formatDate } from "@/lib/utils/dates";

interface MemberUser {
  id: string;
  name: string;
  telegramHandle: string | null;
  avatarUrl: string | null;
}

interface ClubMember {
  userId: string;
  role: ClubRole;
  joinedAt: string;
  user: MemberUser;
}

interface ClubMembersListProps {
  members: ClubMember[];
  currentUserRole: ClubRole | null;
  currentUserId: string | null;
  isArchived: boolean;
  clubId: string;
  onMemberRemoved?: () => void;
  /** B5.3: Handler for billing errors (402 PAYWALL) */
  handleBillingError?: (error: unknown) => { handled: boolean };
}

export function ClubMembersList({
  members,
  currentUserRole,
  currentUserId,
  isArchived,
  clubId,
  onMemberRemoved,
  handleBillingError,
}: ClubMembersListProps) {
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isOwner = currentUserRole === "owner";

  // Per Visual Contract v4 §5: Owner may remove member (if not archived)
  const canRemoveMember = (member: ClubMember): boolean => {
    if (!isOwner) return false;
    if (isArchived) return false;
    // Cannot remove self (owner)
    if (member.userId === currentUserId) return false;
    // Cannot remove other owners (there should be only one, but safety check)
    if (member.role === "owner") return false;
    return true;
  };

  const handleRemoveMember = async (memberId: string) => {
    // B5.3: Archived state short-circuits BEFORE any API call or billing handling
    if (!isOwner || isArchived) return;
    
    setRemovingMemberId(memberId);
    setError(null);
    
    try {
      const response = await fetch(`/api/clubs/${clubId}/members/${memberId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const data = await response.json();
        
        // B5.3: Try billing error handling first (402 PAYWALL)
        // Create error object with shape expected by handleApiError
        if (handleBillingError) {
          const errorObj = {
            status: response.status,
            statusCode: response.status,
            code: data.error?.code,
            error: data.error,
            details: data.error?.details,
            ...(data.error?.details || {}),
          };
          
          const { handled } = handleBillingError(errorObj);
          if (handled) {
            // Modal shown via BillingModalHost, no further action
            return;
          }
        }
        
        // Non-billing errors: per Visual Contract v4 §6 Error → UI Mapping
        if (response.status === 401) {
          // Redirect to login - handled by middleware typically
          window.location.href = "/login";
          return;
        }
        if (response.status === 409) {
          setError(data.error?.message || "Операция уже выполнена. Обновите страницу.");
          onMemberRemoved?.();
          return;
        }
        
        throw new Error(data.error?.message || "Не удалось удалить участника");
      }
      
      // Success - refresh the list
      onMemberRemoved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setRemovingMemberId(null);
    }
  };

  const getRoleBadgeVariant = (role: ClubRole): "success" | "info" | "neutral" | "warning" => {
    switch (role) {
      case "owner":
        return "success";
      case "admin":
        return "info";
      case "member":
        return "neutral";
      case "pending":
        return "warning";
      default:
        return "neutral";
    }
  };

  if (members.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">
          Участники
        </h2>
        <p className="text-center text-muted-foreground py-8">
          Нет участников
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">
          Участники ({members.length})
        </h2>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="mb-4 rounded-lg bg-[#FEF2F2] p-3 text-sm text-[#DC2626]">
          {error}
        </div>
      )}
      
      <div className="space-y-3">
        {members.map((member) => {
          const canRemove = canRemoveMember(member);
          const isRemoving = removingMemberId === member.userId;
          
          return (
            <div
              key={member.userId}
              className="flex items-center gap-4 rounded-xl border border-[var(--color-border)] p-4 transition-colors hover:bg-[var(--color-bg-subtle)]"
            >
              {/* Avatar */}
              <Avatar className="h-12 w-12">
                {member.user.avatarUrl && (
                  <AvatarImage 
                    src={member.user.avatarUrl} 
                    alt={member.user.name} 
                  />
                )}
                <AvatarFallback className="bg-[var(--color-primary-bg)] text-[var(--color-primary)] font-medium">
                  {member.user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[var(--color-text)] truncate">
                  {member.user.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  С {formatDate(member.joinedAt)}
                </p>
              </div>

              {/* Role badge */}
              <Badge variant={getRoleBadgeVariant(member.role)} size="sm">
                {getClubRoleLabel(member.role)}
              </Badge>

              {/* Remove action - Owner only, not archived */}
              {isOwner && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          disabled={!canRemove || isRemoving}
                          onClick={() => handleRemoveMember(member.userId)}
                          className={!canRemove ? "cursor-not-allowed opacity-50" : ""}
                        >
                          {isRemoving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserMinus className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isArchived ? (
                        <p>Клуб в архиве</p>
                      ) : member.userId === currentUserId ? (
                        <p>Нельзя удалить себя</p>
                      ) : member.role === "owner" ? (
                        <p>Нельзя удалить владельца</p>
                      ) : (
                        <p>Удалить участника</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
