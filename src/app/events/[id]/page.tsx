import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Users, Calendar as CalendarIcon, Car, PencilLine, Lock } from "lucide-react";

export const dynamic = "force-dynamic";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ParticipantModal } from "@/components/events/participant-modal";
import { EventLocationsCard } from "@/components/events/EventLocationsCard";
import { LocationHeaderItem } from "@/components/events/LocationHeaderItem";
import { MobileSectionNav } from "@/components/ui/mobile-section-nav";
import { getEventBasicInfo } from "@/lib/services/events";
import { getCurrentUserSafe } from "@/lib/auth/currentUser";
import { getGuestSessionId } from "@/lib/auth/guestSession";
import { getUserById } from "@/lib/db/userRepo";
import { getCategoryLabel, getCategoryBadgeVariant } from "@/lib/utils/eventCategories";
import { formatDateTime } from "@/lib/utils/dates";
import { EventParticipantsAsync } from "./_components/participants-async";
import { EventParticipantsSkeleton } from "@/components/ui/skeletons";

export default async function EventDetails({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const { id } = await params;
  
  // Загружаем критичные данные сразу
  const [currentUser, guestSessionId, event] = await Promise.all([
    getCurrentUserSafe(),
    (async () => {
      const u = await getCurrentUserSafe();
      return u ? null : await getGuestSessionId();
    })(),
    getEventBasicInfo(id, { enforceVisibility: true }).catch(() => null),
  ]);
  
  if (!event) return notFound();
  
  const isOwner = currentUser?.id === event.createdByUserId;
  
  // Загружаем информацию о владельце (быстрый запрос)
  const ownerUser = event.createdByUserId 
    ? await getUserById(event.createdByUserId) 
    : null;

  // Проверяем, зарегистрирован ли текущий пользователь (для скрытия кнопки)
  const { listParticipants } = await import("@/lib/db/participantRepo");
  const dbParticipants = await listParticipants(id);
  const isUserRegistered = dbParticipants.some(
    (p) => 
      (currentUser?.id && p.user_id === currentUser.id) ||
      (guestSessionId && p.guest_session_id === guestSessionId)
  );

  const categoryLabel = event.category ? getCategoryLabel(event.category) : null;
  const categoryBadgeVariant = event.category ? getCategoryBadgeVariant(event.category) : "solid-gray";
  const formattedDateTime = formatDateTime(event.dateTime);
  const vehicleTypeLabelMap: Record<string, string> = {
    any: "Любой",
    sedan: "Легковой",
    crossover: "Кроссовер",
    suv: "Внедорожник",
  };
  const vehicleTypeLabel = vehicleTypeLabelMap[event.vehicleTypeRequirement] ?? "Любой";
  
  // Проверяем, прошло ли событие
  const isPastEvent = new Date(event.dateTime) < new Date();
  
  // Participants count (fast query, already loaded)
  const participantsCountLabel = `${event.participantsCount} / ${event.maxParticipants ?? "∞"} участников`;
  const fillPercent =
    event.maxParticipants && event.maxParticipants > 0
      ? Math.min(100, Math.round((event.participantsCount / event.maxParticipants) * 100))
      : null;
  const isFull =
    event.maxParticipants !== null &&
    event.maxParticipants !== undefined &&
    event.participantsCount >= event.maxParticipants;

  // Build sections for mobile navigation
  const mobileSections = [
    { id: "event-description", label: "Описание" },
    ...(event.rules && event.rules.trim().length > 0
      ? [{ id: "event-rules", label: "Правила участия" }]
      : []),
    { id: "event-participants", label: "Участники" },
    ...(event.isPaid ? [{ id: "event-price", label: "Стоимость" }] : []),
    ...(event.locations && event.locations.length > 0
      ? [{ id: "event-locations", label: "Точки маршрута" }]
      : []),
    { id: "event-vehicle", label: "Требования к авто" },
    ...(ownerUser ? [{ id: "event-organizer", label: "Организатор" }] : []),
  ];

  return (
    <>
      {/* Back button */}
      <Button variant="ghost" asChild className="mb-6">
        <Link href="/events">← Назад к событиям</Link>
      </Button>

      {/* Header Section */}
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          {/* Title */}
          <h1 className="mb-4 text-[32px] font-bold leading-[1.2] text-[#1F2937] md:text-[36px]">
            {event.title}
          </h1>

          {/* Badges */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {categoryLabel && event.category ? (
              <Badge variant={categoryBadgeVariant} size="md">
                {categoryLabel}
              </Badge>
            ) : null}
            {event.isClubEvent && <Badge variant="club" size="md">Клубное событие</Badge>}
            <Badge variant={event.isPaid ? "paid" : "free"} size="md">
              {event.isPaid ? "Платное" : "Бесплатное"}
            </Badge>
            {isPastEvent && (
              <Badge variant="registration-closed" size="md" className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                Регистрация закрыта
              </Badge>
            )}
            {isFull && !isPastEvent && (
              <Badge variant="warning" size="md">
                Лимит достигнут
              </Badge>
            )}
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 gap-4 text-[15px] text-[#6B7280] md:grid-cols-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 flex-shrink-0" />
              <span>{formattedDateTime}</span>
            </div>
            
            {/* Location - First point with navigation */}
            {event.locations && event.locations.length > 0 ? (
              <LocationHeaderItem
                location={event.locations[0]}
              />
            ) : event.locationText ? (
              <LocationHeaderItem
                fallbackText={event.locationText}
              />
            ) : null}
            
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 flex-shrink-0" />
              <span>{participantsCountLabel}</span>
            </div>
            {event.city && (
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5 flex-shrink-0" />
                <span>{event.city.name}{event.city.region && `, ${event.city.region}`}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row md:flex-col md:w-auto">
          {isPastEvent ? (
            <Button variant="secondary" disabled className="w-full sm:w-auto">
              <Lock className="mr-2 h-4 w-4" />
              Регистрация закрыта
            </Button>
          ) : (
            !isFull && !isUserRegistered && (
              <ParticipantModal
                mode="create"
                eventId={event.id}
                customFieldsSchema={event.customFieldsSchema}
                event={event}
                triggerLabel="Присоединиться"
              />
            )
          )}
          {isOwner && (
            <Button variant="secondary" asChild className="w-full sm:w-auto">
              <Link href={`/events/${event.id}/edit`}>
                <PencilLine className="mr-2 h-4 w-4" />
                Редактировать
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {fillPercent !== null && (
        <div className="mb-8">
          <ProgressBar value={fillPercent} label="Заполнено мест" />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 pb-20 lg:grid-cols-[2fr,1fr] lg:pb-0">
          {/* Left Column - Description, Rules, Participants */}
          <div className="space-y-6">
            {/* Description Card */}
            <Card id="event-description">
              <CardHeader>
                <CardTitle>Описание</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-[15px] leading-[1.6] text-[#374151]">
                  {event.description}
                </p>
              </CardContent>
            </Card>

            {/* Rules Card */}
            {event.rules && event.rules.trim().length > 0 && (
              <Card id="event-rules">
                <CardHeader>
                  <CardTitle>Правила участия</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line text-[15px] leading-[1.6] text-[#374151]">
                    {event.rules}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Participants Card - загружаем через Suspense */}
            <div id="event-participants">
              <Suspense fallback={<EventParticipantsSkeleton />}>
                <EventParticipantsAsync
                  eventId={event.id}
                  event={event}
                  isOwner={isOwner}
                  currentUserId={currentUser?.id}
                  guestSessionId={guestSessionId ?? undefined}
                  isPastEvent={isPastEvent}
                />
              </Suspense>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Price Card */}
            {event.isPaid && (
              <Card id="event-price">
                <CardHeader>
                  <CardTitle>Стоимость участия</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-[32px] font-bold leading-none text-[#1F2937]">
                    {event.price ?? 0} {event.currency?.symbol ?? event.currencyCode ?? ""}
                  </p>
                  <p className="text-[13px] text-[#6B7280]">за экипаж</p>
                </CardContent>
              </Card>
            )}

            {/* Locations Card - NEW */}
            {event.locations && event.locations.length > 0 && (
              <div id="event-locations">
                <EventLocationsCard locations={event.locations} />
              </div>
            )}

            {/* Vehicle Requirements Card */}
            <Card id="event-vehicle">
              <CardHeader>
                <CardTitle>Требования к авто</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <p className="text-[13px] font-medium text-[#6B7280]">Тип автомобиля</p>
                  <p className="text-[15px] font-semibold text-[#1F2937]">
                    {vehicleTypeLabel}
                  </p>
                </div>
                {event.allowedBrands.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[13px] font-medium text-[#6B7280]">Рекомендуемые марки</p>
                    <div className="flex flex-wrap gap-2">
                      {event.allowedBrands.map((brand) => (
                        <Badge 
                          key={brand.id}
                          variant="secondary" 
                          size="md"
                          className="rounded-full"
                        >
                          {brand.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Organizer Card */}
            {ownerUser && (
              <Card id="event-organizer">
                <CardHeader>
                  <CardTitle>Организатор</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-[15px] font-semibold text-[#1F2937]">
                    {ownerUser.name || ownerUser.telegramHandle || "Организатор"}
                  </p>
                  {ownerUser.telegramHandle && (
                    <p className="text-[13px] text-[#6B7280]">@{ownerUser.telegramHandle}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

      {/* Mobile Section Navigation */}
      <MobileSectionNav sections={mobileSections} />
    </>
  );
}
