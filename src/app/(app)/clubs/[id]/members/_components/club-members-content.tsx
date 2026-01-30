/**
 * ClubMembersContent Component
 * 
 * Client component that fetches and displays:
 * - Members List (API-019)
 * - Pending Join Requests (API-054, owner/admin - per V5 §4)
 * 
 * Per Visual Contract v4 + v5:
 * - No optimistic UI
 * - Explicit refresh after mutations
 * - Section-level loading states
 * - Requests section visible to Owner OR Admin (V5 §4)
 * 
 * B5.3: Billing wiring for members mutations (402 PAYWALL handling)
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

// B5.3: Billing modal infrastructure
import { BillingModalHost, useHandleApiError } from "@/components/billing/BillingModalHost";

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
  /** Per V5 §4: Owner OR Admin can manage requests */
  canManageRequests: boolean;
  isArchived: boolean;
}

/**
 * B5.3: Wrapper component providing BillingModalHost context.
 * Pattern per PHASE_B5-1_EVENT_CREATE_EDIT_IMPLEMENTATION.md
 */
export function ClubMembersContent(props: ClubMembersContentProps) {
  return (
    <BillingModalHost>
      <ClubMembersContentImpl {...props} />
    </BillingModalHost>
  );
}

/**
 * Inner implementation with access to billing modal context.
 */
function ClubMembersContentImpl({
  clubId,
  currentUserId,
  currentUserRole,
  canManageRequests,
  isArchived,
}: ClubMembersContentProps) {
  // B5.3: Initialize billing error handling
  // No onConfirmCredit — credit confirmation doesn't apply to members
  // per B3-3 matrix: MAX_CLUB_MEMBERS_EXCEEDED is 402 PAYWALL, not 409
  const { handleError } = useHandleApiError({ clubId });
  // Members state
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);

  // Join requests state (owner/admin per V5 §4)
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

  // Fetch join requests (API-054, owner/admin per V5 §4)
  const fetchJoinRequests = useCallback(async () => {
    if (!canManageRequests) {
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
          // Not owner/admin - just hide section
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
  }, [clubId, canManageRequests]);

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
          handleBillingError={handleError}
        />
      )}

      {/* SECTION 3: Pending Join Requests (Blocking, owner/admin) - per Visual Contract v4 §6, v5 §4 */}
      {/* Per Visual Contract v5 §4: Section visible to Owner OR Admin */}
      {canManageRequests && (
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
            handleBillingError={handleError}
          />
        )
      )}
    </>
  );
}
