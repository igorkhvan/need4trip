/**
 * Club Details Page
 * 
 * Страница деталей клуба
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Users, Settings, MapPin, Globe, Send } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getClubWithDetails } from "@/lib/services/clubs";
import { ClubMembersList } from "@/components/clubs/club-members-list";
import { ClubSubscriptionCard } from "@/components/clubs/club-subscription-card";
import { Badge } from "@/components/ui/badge";
import { getClubRoleLabel } from "@/lib/types/club";

export const dynamic = "force-dynamic";

interface ClubDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClubDetailsPage({ params }: ClubDetailsPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  
  // Прямой вызов сервиса вместо fetch
  let club;
  try {
    club = await getClubWithDetails(id, user);
  } catch (error) {
    console.error("[ClubDetailsPage] Failed to load club", error);
    notFound();
  }

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
  
  // Показывать боковую панель только если есть что показать
  const showSidebar = isOwner && club.subscription;

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="page-container space-y-6 pb-10 pt-12">
        {/* Кнопка назад */}
        <Link
          href="/clubs"
          className="inline-flex items-center gap-2 text-[15px] text-[#6B7280] transition-colors hover:text-[#1F2937]"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Все клубы</span>
        </Link>

        <div className={showSidebar ? "grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8" : ""}>
          {/* Основная информация */}
          <div className={`space-y-6 ${showSidebar ? "lg:col-span-2" : ""}`}>
            {/* Заголовок */}
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
              <div className="flex items-start gap-6">
                {/* Логотип */}
                {club.logoUrl ? (
                  <img
                    src={club.logoUrl}
                    alt={club.name}
                    className="h-24 w-24 flex-shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6F2C] to-[#E86223] text-3xl font-bold text-white">
                    {club.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="flex-1">
                  <div className="mb-3 flex items-start justify-between">
                    <h1 className="text-[28px] font-bold text-[#1F2937] md:text-[32px]">{club.name}</h1>
                    {canManage && (
                      <Link
                        href={`/clubs/${club.id}/manage`}
                        className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] px-4 py-2 text-[15px] text-[#111827] transition-colors hover:bg-[#F9FAFB]"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Управление</span>
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
                  <div className="flex flex-wrap gap-4 text-[14px] text-[#6B7280]">
                    {club.cities && club.cities.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span>
                          {club.cities.length === 1
                            ? club.cities[0].region
                              ? `${club.cities[0].name}, ${club.cities[0].region}`
                              : club.cities[0].name
                            : `${club.cities.length} городов`}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      <span>{club.memberCount} участников</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      <span>{club.eventCount} событий</span>
                    </div>
                  </div>

                  {/* Ссылки */}
                  {(club.telegramUrl || club.websiteUrl) && (
                    <div className="mt-4 flex gap-3">
                      {club.telegramUrl && (
                        <a
                          href={club.telegramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] px-4 py-2 text-[14px] text-[#111827] transition-colors hover:bg-[#F9FAFB]"
                        >
                          <Send className="h-4 w-4" />
                          <span>Telegram</span>
                        </a>
                      )}
                      {club.websiteUrl && (
                        <a
                          href={club.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] px-4 py-2 text-[14px] text-[#111827] transition-colors hover:bg-[#F9FAFB]"
                        >
                          <Globe className="h-4 w-4" />
                          <span>Сайт</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Описание и Города */}
              {(club.description || (club.cities && club.cities.length > 0)) && (
                <div className="mt-6 space-y-6 border-t border-[#E5E7EB] pt-6">
                  {/* Города клуба */}
                  {club.cities && club.cities.length > 0 && (
                    <div>
                      <h2 className="mb-3 flex items-center gap-2 text-[18px] font-semibold text-[#1F2937]">
                        <MapPin className="h-5 w-5 text-[#6B7280]" />
                        <span>Города клуба</span>
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
                      <h2 className="mb-3 text-[18px] font-semibold text-[#1F2937]">О клубе</h2>
                      <p className="whitespace-pre-wrap text-[15px] text-[#111827]">{club.description}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Участники */}
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-[18px] font-semibold text-[#1F2937]">
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

          {/* Боковая панель (только если есть что показать) */}
          {showSidebar && (
            <div className="space-y-6">
              {/* Подписка (только для owner) */}
              <ClubSubscriptionCard
                subscription={club.subscription}
                canManage={isOwner}
              />

              {/* TODO: Последние события клуба */}
              {/* TODO: Кнопка "Вступить в клуб" для не-членов */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

