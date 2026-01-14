/**
 * ClubMembersContent Component
 * 
 * Client component that fetches and displays:
 * - Members List (API-019)
 * - Pending Join Requests (API-054, owner only)
 * 
 * Per Visual Contract v4:
 * - No optimistic UI
 * - Explicit refresh after mutations
 * - Section-level loading states
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { ClubMembersList } from "./club-members-list";
import { ClubPendingJoinRequests } from "./club-pending-join-requests";
import {
  ClubMembersListSkeleton,
  ClubPendingJoinRequestsSkeleton,
} from "@/components/ui/skeletons";
import type { ClubRole } from "@/lib/types/club";

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

interface JoinRequestUser {
  id: string;
  name: string;
  telegramHandle: string | null;
  avatarUrl: string | null;
}

interface JoinRequest {
  id: string;
  clubId: string;
  requesterUserId: string;
  status: string;
  message: string | null;
  createdAt: string;
  user?: JoinRequestUser;
}

interface ClubMembersContentProps {
  clubId: string;
  currentUserId: string;
  currentUserRole: ClubRole | null;
  isOwner: boolean;
  isArchived: boolean;
}

export function ClubMembersContent({
  clubId,
  currentUserId,
  currentUserRole,
  isOwner,
  isArchived,
}: ClubMembersContentProps) {
  // Members state
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);

  // Join requests state (owner only)
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState<string | null>(null);

  // Fetch members (API-019)
  const fetchMembers = useCallback(async () => {
    setMembersLoading(true);
    setMembersError(null);
    
    try {
      const response = await fetch(`/api/clubs/${clubId}/members`);
      
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (response.status === 403) {
          setMembersError("Нет доступа к списку участников");
          return;
        }
        throw new Error("Не удалось загрузить участников");
      }
      
      const data = await response.json();
      setMembers(data.data?.members || []);
    } catch (err) {
      setMembersError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setMembersLoading(false);
    }
  }, [clubId]);

  // Fetch join requests (API-054, owner only)
  const fetchJoinRequests = useCallback(async () => {
    if (!isOwner) {
      setRequestsLoading(false);
      return;
    }
    
    setRequestsLoading(true);
    setRequestsError(null);
    
    try {
      const response = await fetch(`/api/clubs/${clubId}/join-requests`);
      
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (response.status === 403) {
          // Not owner - just hide section
          setJoinRequests([]);
          return;
        }
        throw new Error("Не удалось загрузить заявки");
      }
      
      const data = await response.json();
      setJoinRequests(data.data?.joinRequests || []);
    } catch (err) {
      setRequestsError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setRequestsLoading(false);
    }
  }, [clubId, isOwner]);

  // Initial data fetch
  useEffect(() => {
    fetchMembers();
    fetchJoinRequests();
  }, [fetchMembers, fetchJoinRequests]);

  // Handlers for refresh after mutations
  const handleMemberRemoved = useCallback(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleRequestProcessed = useCallback(() => {
    fetchJoinRequests();
    // Also refresh members as approved requests become members
    fetchMembers();
  }, [fetchJoinRequests, fetchMembers]);

  return (
    <>
      {/* SECTION 2: Members List (Blocking) - per Visual Contract v4 §5 */}
      {membersLoading ? (
        <ClubMembersListSkeleton />
      ) : membersError ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
          <div className="text-center py-8">
            <p className="text-[#DC2626]">{membersError}</p>
            <button
              onClick={fetchMembers}
              className="mt-4 text-[var(--color-primary)] hover:underline"
            >
              Попробовать снова
            </button>
          </div>
        </div>
      ) : (
        <ClubMembersList
          members={members}
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
          isArchived={isArchived}
          clubId={clubId}
          onMemberRemoved={handleMemberRemoved}
        />
      )}

      {/* SECTION 3: Pending Join Requests (Blocking, owner only) - per Visual Contract v4 §6 */}
      {/* Per Visual Contract v4 §6: Entire section is hidden for non-owners */}
      {isOwner && (
        requestsLoading ? (
          <ClubPendingJoinRequestsSkeleton />
        ) : requestsError ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">
              Заявки на вступление
            </h2>
            <div className="text-center py-8">
              <p className="text-[#DC2626]">{requestsError}</p>
              <button
                onClick={fetchJoinRequests}
                className="mt-4 text-[var(--color-primary)] hover:underline"
              >
                Попробовать снова
              </button>
            </div>
          </div>
        ) : (
          <ClubPendingJoinRequests
            requests={joinRequests}
            isArchived={isArchived}
            clubId={clubId}
            onRequestProcessed={handleRequestProcessed}
          />
        )
      )}
    </>
  );
}
