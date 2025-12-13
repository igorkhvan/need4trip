/**
 * Club Details Page
 * 
 * Страница деталей клуба
 */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Users, Settings, MapPin, Globe, Send } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { ClubMembersList } from "@/components/clubs/club-members-list";
import { ClubSubscriptionCard } from "@/components/clubs/club-subscription-card";
import { Badge } from "@/components/ui/badge";
import { getClubRoleLabel } from "@/lib/types/club";

export const dynamic = "force-dynamic";

async function getClubDetails(id: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/clubs/${id}`, {
      cache: "no-store",
    });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    return data.club;
  } catch (err) {
    console.error("[getClubDetails] Failed", err);
    return null;
  }
}

interface ClubDetailsPageProps {
  params: { id: string };
}

export default async function ClubDetailsPage({ params }: ClubDetailsPageProps) {
  const [club, user] = await Promise.all([
    getClubDetails(params.id),
    getCurrentUser(),
  ]);

  if (!club) {
    notFound();
  }

  // Найти роль текущего пользователя
  const currentUserMember = club.members?.find(
    (m: any) => m.userId === user?.id
  );
  const userRole = currentUserMember?.role;
  const canManage = userRole === "owner" || userRole === "organizer";
  const isOwner = userRole === "owner";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Кнопка назад */}
        <Link
          href="/clubs"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Все клубы
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Основная информация */}
          <div className="lg:col-span-2 space-y-6">
            {/* Заголовок */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start gap-6">
                {/* Логотип */}
                {club.logoUrl ? (
                  <img
                    src={club.logoUrl}
                    alt={club.name}
                    className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
                    {club.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <h1 className="text-3xl font-bold text-gray-900">{club.name}</h1>
                    {canManage && (
                      <Link
                        href={`/clubs/${club.id}/manage`}
                        className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        Управление
                      </Link>
                    )}
                  </div>

                  {/* Роль пользователя */}
                  {userRole && (
                    <div className="mb-3">
                      <Badge variant="default" size="sm">
                        {getClubRoleLabel(userRole)}
                      </Badge>
                    </div>
                  )}

                  {/* Метаинформация */}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    {club.cities && club.cities.length > 0 && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span>
                          {club.cities.length === 1
                            ? club.cities[0].region
                              ? `${club.cities[0].name}, ${club.cities[0].region}`
                              : club.cities[0].name
                            : `${club.cities.length} городов`}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{club.memberCount} участников</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{club.eventCount} событий</span>
                    </div>
                  </div>

                  {/* Ссылки */}
                  {(club.telegramUrl || club.websiteUrl) && (
                    <div className="flex gap-3 mt-4">
                      {club.telegramUrl && (
                        <a
                          href={club.telegramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Send className="w-4 h-4" />
                          Telegram
                        </a>
                      )}
                      {club.websiteUrl && (
                        <a
                          href={club.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Globe className="w-4 h-4" />
                          Сайт
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Описание и Города */}
              {(club.description || (club.cities && club.cities.length > 0)) && (
                <div className="mt-6 pt-6 border-t border-gray-200 space-y-6">
                  {/* Города клуба */}
                  {club.cities && club.cities.length > 0 && (
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-gray-600" />
                        Города клуба
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {club.cities.map((city: any) => (
                          <Badge key={city.id} variant="secondary" size="md">
                            {city.region ? `${city.name}, ${city.region}` : city.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Описание */}
                  {club.description && (
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 mb-3">О клубе</h2>
                      <p className="text-gray-700 whitespace-pre-wrap">{club.description}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Участники */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Участники ({club.memberCount})
              </h2>
              <ClubMembersList
                clubId={club.id}
                members={club.members ?? []}
                canManage={isOwner}
                currentUserId={user?.id}
              />
            </div>
          </div>

          {/* Боковая панель */}
          <div className="space-y-6">
            {/* Подписка (только для owner) */}
            {isOwner && club.subscription && (
              <ClubSubscriptionCard
                subscription={club.subscription}
                canManage={isOwner}
              />
            )}

            {/* TODO: Последние события клуба */}
            {/* TODO: Кнопка "Вступить в клуб" для не-членов */}
          </div>
        </div>
      </div>
    </div>
  );
}

