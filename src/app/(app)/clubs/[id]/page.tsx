/**
 * Club Details Page
 * 
 * Страница деталей клуба с Streaming SSR
 */

import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Users, Settings, MapPin, Globe, Send } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getClubBasicInfo, getUserClubRole } from "@/lib/services/clubs";
import { Badge } from "@/components/ui/badge";
import { getClubRoleLabel } from "@/lib/types/club";
import { ClubMembersAsync } from "./_components/members-async";
import { ClubSubscriptionAsync } from "./_components/subscription-async";
import { ClubMembersSkeleton, ClubSubscriptionSkeleton } from "@/components/ui/skeletons";

export const dynamic = "force-dynamic";

interface ClubDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClubDetailsPage({ params }: ClubDetailsPageProps) {
  const { id } = await params;
  
  // Загружаем критичные данные сразу
  const [user, club, userRole] = await Promise.all([
    getCurrentUser(),
    getClubBasicInfo(id).catch(() => null),
    (async () => {
      const u = await getCurrentUser();
      return getUserClubRole(id, u?.id);
    })(),
  ]);

  if (!club) {
    notFound();
  }

  const canManage = userRole === "owner" || userRole === "admin";
  const isOwner = userRole === "owner";
  
  // Показывать боковую панель только для owner
  const showSidebar = isOwner;

  return (
    <>
      <div className="space-y-6 pb-10 pt-12">
        {/* Кнопка назад */}
        <Link
          href="/clubs"
          className="inline-flex items-center gap-2 text-base text-muted-foreground transition-colors hover:text-[var(--color-text)]"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Все клубы</span>
        </Link>

        <div className={showSidebar ? "grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8" : ""}>
          {/* Основная информация */}
          <div className={`space-y-6 ${showSidebar ? "lg:col-span-2" : ""}`}>
            {/* Заголовок */}
            <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
              <div className="flex items-start gap-6">
                {/* Логотип */}
                {club.logoUrl ? (
                  <img
                    src={club.logoUrl}
                    alt={club.name}
                    className="h-24 w-24 flex-shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-hover)] text-3xl font-bold text-white">
                    {club.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="flex-1">
                  <div className="mb-3 flex items-start justify-between">
                    <h1 className="text-3xl font-bold text-[var(--color-text)] md:text-4xl">{club.name}</h1>
                    {canManage && (
                      <Link
                        href={`/clubs/${club.id}/manage`}
                        className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2 text-base text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg-subtle)]"
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
                  <div className="flex flex-wrap gap-4 text-[14px] text-muted-foreground">
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
                        <MapPin className="h-5 w-5 text-muted-foreground" />
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

            {/* Участники - загружаем через Suspense */}
            <Suspense fallback={<ClubMembersSkeleton />}>
              <ClubMembersAsync
                clubId={club.id}
                canManage={canManage}
                currentUserId={user?.id}
              />
            </Suspense>
          </div>

          {/* Боковая панель (только для owner) */}
          {showSidebar && (
            <div className="space-y-6">
              {/* Подписка - загружаем через Suspense */}
              <Suspense fallback={<ClubSubscriptionSkeleton />}>
                <ClubSubscriptionAsync 
                  clubId={club.id}
                  canManage={isOwner}
                />
              </Suspense>

              {/* TODO: Последние события клуба */}
              {/* TODO: Кнопка "Вступить в клуб" для не-членов */}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

