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
}

export async function ClubSubscriptionAsync({ clubId }: ClubSubscriptionAsyncProps) {
  // Загружаем подписку (может быть null для free плана)
  const subscription = await getClubSubscription(clubId);

  // Если нет подписки - не показываем карточку
  if (!subscription) {
    return null;
  }

  return <ClubSubscriptionCard clubId={clubId} subscription={subscription} />;
}
