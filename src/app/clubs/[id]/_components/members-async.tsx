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
    <ClubMembersList
      clubId={clubId}
      members={members}
      canManage={canManage}
      isOwner={isOwner}
    />
  );
}
