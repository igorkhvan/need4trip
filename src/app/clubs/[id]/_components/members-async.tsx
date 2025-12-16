/**
 * ClubMembersAsync Component
 * 
 * Async компонент для загрузки списка участников клуба.
 * Используется внутри Suspense boundary для параллельной загрузки.
 */

import { ClubMembersList } from "@/components/clubs/club-members-list";
import { listMembersWithUser } from "@/lib/db/clubMemberRepo";
import { mapDbClubMemberWithUserToDomain } from "@/lib/services/clubs";

interface ClubMembersAsyncProps {
  clubId: string;
  canManage: boolean;
  isOwner: boolean;
}

export async function ClubMembersAsync({ 
  clubId, 
  canManage,
  isOwner 
}: ClubMembersAsyncProps) {
  // Загружаем участников
  const dbMembers = await listMembersWithUser(clubId);
  const members = dbMembers.map(mapDbClubMemberWithUserToDomain);

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-[18px] font-semibold text-[#1F2937]">
        Участники ({members.length})
      </h2>
      <ClubMembersList
        clubId={clubId}
        members={members}
        canManage={canManage}
        isOwner={isOwner}
      />
    </div>
  );
}
