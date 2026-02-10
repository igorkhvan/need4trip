/**
 * ClubSubscriptionAsync Component
 * 
 * Async компонент для загрузки информации о подписке клуба.
 * Используется внутри Suspense boundary для параллельной загрузки.
 */

import { ClubSubscriptionCard } from "@/components/clubs/club-subscription-card";
import { getClubSubscription } from "@/lib/db/clubSubscriptionRepo";

interface ClubSubscriptionAsyncProps {
  clubId: string;
  canManage: boolean;
}

export async function ClubSubscriptionAsync({ 
  clubId,
  canManage 
}: ClubSubscriptionAsyncProps) {
  // Загружаем подписку (может быть null для free плана)
  const subscription = await getClubSubscription(clubId);

  // Если нет подписки - не показываем карточку
  if (!subscription) {
    return null;
  }

  return (
    <ClubSubscriptionCard 
      subscription={subscription} 
      canManage={canManage}
    />
  );
}
