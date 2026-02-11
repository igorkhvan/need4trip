import { Suspense } from "react";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";

import { Users, Calendar as CalendarIcon, Car, PencilLine, Lock, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ParticipantModal } from "@/components/events/participant-modal";
import { EventLocationsCard } from "@/components/events/event-locations-card";
import { LocationHeaderItem } from "@/components/events/location-header-item";
import { MobileSectionProgress } from "@/components/ui/mobile-section-progress";
import { EventRegistrationControl } from "@/components/events/event-registration-control";
import { EventDangerZone } from "@/components/events/event-danger-zone";
import { EventAccessBadge } from "@/components/events/event-access-badge";
import { LockedIndicator } from "@/components/ui/locked-indicator";
import { ScrollRestorationWrapper } from "@/components/scroll-restoration-wrapper";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { getEventBasicInfo } from "@/lib/services/events";
import { getEventBySlug, getEventSlugById } from "@/lib/db/eventRepo";
import { getCurrentUserSafe } from "@/lib/auth/currentUser";
import { getGuestSessionId } from "@/lib/auth/guestSession";
import { getUserById } from "@/lib/db/userRepo";
import { getCategoryLabel, getCategoryBadgeVariant, getCategoryIcon } from "@/lib/utils/eventCategories";
import { formatDateTime } from "@/lib/utils/dates";
import { stripHtml, truncateText } from "@/lib/utils/text";
import { getPublicBaseUrl } from "@/lib/config/runtimeConfig";
import { buildEventMetadata } from "@/lib/seo/metadataBuilder";
import { buildEventJsonLd } from "@/lib/seo/schemaBuilder";
import { isRegistrationClosed, getRegistrationClosedReason } from "@/lib/utils/eventPermissions";
import { EventParticipantsAsync } from "./_components/participants-async";
import { EventParticipantsSkeleton } from "@/components/ui/skeletons";
import { SectionErrorBoundary } from "@/components/section-error-boundary";

// UUID regex for legacy URL detection (SSOT_SEO.md §3.1)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// OG / Social Sharing metadata
// See: docs/blueprint/OG_SOCIAL_SHARING_BLUEPRINT.md
// ---------------------------------------------------------------------------
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}): Promise<Metadata> {
  const { slug } = await params;

  // UUID detection: permanent redirect to slug URL (SSOT §3.1)
  if (UUID_RE.test(slug)) {
    const eventSlug = await getEventSlugById(slug);
    if (eventSlug) permanentRedirect(`/events/${eventSlug}`);
    return { title: "Событие не найдено" };
  }

  // Resolve slug → id, then load event WITHOUT visibility enforcement (crawlers have no auth)
  const dbEvent = await getEventBySlug(slug).catch(() => null);
  const event = dbEvent ? await getEventBasicInfo(dbEvent.id).catch(() => null) : null;

  if (!event) {
    return { title: "Событие не найдено" };
  }

  // Delegate to centralized builder (handles restricted, public, unlisted)
  return buildEventMetadata({
    title: event.title,
    slug,
    plainDescription: truncateText(stripHtml(event.description), 160),
    cityName: event.city?.name,
    dateFormatted: formatDateTime(event.dateTime),
    participantsCount: event.participantsCount ?? 0,
    maxParticipants: event.maxParticipants,
    ogImage: event.club?.logoUrl,
    visibility: event.visibility as "public" | "unlisted" | "restricted",
  });
}

export default async function EventDetails({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const { slug } = await params;

  // UUID detection: permanent redirect to slug URL (SSOT §3.1) — safety net
  if (UUID_RE.test(slug)) {
    const eventSlug = await getEventSlugById(slug);
    if (eventSlug) permanentRedirect(`/events/${eventSlug}`);
    return notFound();
  }

  // 0. Resolve slug → DB event
  const dbEvent = await getEventBySlug(slug).catch(() => null);
  if (!dbEvent) {
    return notFound();
  }
  const id = dbEvent.id;
  
  // 1. Загружаем currentUser и guestSessionId параллельно
  const [currentUser, guestSessionId] = await Promise.all([
    getCurrentUserSafe(),
    (async () => {
      const u = await getCurrentUserSafe();
      return u ? null : await getGuestSessionId();
    })(),
  ]);
  
  // 2. Загружаем событие с контекстом пользователя (после загрузки currentUser)
  // ВАЖНО: currentUser должен быть загружен ДО проверки видимости,
  // чтобы владельцы могли видеть свои unlisted/restricted события
  const event = await getEventBasicInfo(id, {
    currentUser,
    enforceVisibility: true
  }).catch(() => null);
  
  if (!event) {
    // Check if event was soft-deleted → show specific UX instead of generic 404
    const { isEventSoftDeleted } = await import("@/lib/db/eventRepo");
    const wasDeleted = await isEventSoftDeleted(id);
    
    if (wasDeleted) {
      const { EventDeletedPage } = await import("./_components/event-deleted");
      return <EventDeletedPage />;
    }
    
    return notFound();
  }
  
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
  const CategoryIcon = event.category ? getCategoryIcon(event.category) : null;
  const formattedDateTime = formatDateTime(event.dateTime);
  
  // Use hydrated vehicle type data
  const vehicleTypeLabel = event.vehicleType?.nameRu ?? "Любой";
  
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
    ...(isOwner ? [{ id: "event-registration-control", label: "Управление регистрацией" }] : []),
    ...(isOwner ? [{ id: "event-danger-zone", label: "Опасная зона" }] : []),
  ];

  // ✅ USE CENTRALIZED LOGIC for registration status
  const registrationClosedToUser = isRegistrationClosed(event, currentUser, event.participantsCount);
  const closedReason = getRegistrationClosedReason(event, currentUser, event.participantsCount);

  // ---------------------------------------------------------------------------
  // Structured Data (JSON-LD) — schema.org/Event
  // Per SSOT_SEO.md §7.1 — delegated to centralized schemaBuilder
  // Restricted events: returns null (privacy policy, SSOT §14.3)
  // ---------------------------------------------------------------------------
  const eventJsonLd = buildEventJsonLd({
    title: event.title,
    slug: event.slug,
    description: truncateText(stripHtml(event.description), 300),
    dateTime: event.dateTime,
    visibility: event.visibility as "public" | "unlisted" | "restricted",
    location: event.locations?.[0]
      ? {
          title: event.locations[0].title,
          latitude: event.locations[0].latitude,
          longitude: event.locations[0].longitude,
        }
      : null,
    city: event.city
      ? { name: event.city.name, region: event.city.region }
      : null,
    organizerName: ownerUser
      ? ownerUser.name || ownerUser.telegramHandle || "Организатор"
      : null,
    imageUrl: event.club?.logoUrl,
    isPaid: event.isPaid,
    price: event.price,
    currencyCode: event.currencyCode,
    isFull,
  });

  return (
    <>
      {eventJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
        />
      )}
      <ScrollRestorationWrapper storageKey={`event-${slug}`}>
      {/* Back button */}
      <Link
        href="/events"
        className="inline-flex items-center gap-2 text-base text-muted-foreground transition-colors hover:text-[var(--color-text)] mb-6"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Назад к событиям</span>
      </Link>

      {/* Header Section */}
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          {/* Title with locked indicator */}
          <div className="mb-4 flex flex-col gap-2">
            <h1 className="heading-h1">
              {event.title}
            </h1>
            {closedReason === 'manually_closed' && (
              <LockedIndicator 
                message="Регистрация закрыта организатором" 
                size="md"
              />
            )}
          </div>

          {/* Badges */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {/* Access badge FIRST */}
            <EventAccessBadge event={event} variant="full" size="md" />
            
            {categoryLabel && event.category ? (
              <Badge variant={categoryBadgeVariant} size="md" className="flex items-center gap-1.5">
                {CategoryIcon && <CategoryIcon className="h-3.5 w-3.5" />}
                {categoryLabel}
              </Badge>
            ) : null}
            {event.isClubEvent && event.club && (
              <Link href={`/clubs/${event.club.slug}`}>
                <Badge variant="club" size="md" className="cursor-pointer hover:opacity-80 transition-opacity">
                  Клубное событие
                </Badge>
              </Link>
            )}
            {event.isClubEvent && !event.club && <Badge variant="club" size="md">Клубное событие</Badge>}
            <Badge variant={event.isPaid ? "paid" : "free"} size="md">
              {event.isPaid ? "Платное" : "Бесплатное"}
            </Badge>
            
            {/* Show "Регистрация закрыта" badge */}
            {(isPastEvent || event.registrationManuallyClosed || isFull) && (
              <Badge variant="registration-closed" size="md" className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                Регистрация закрыта
              </Badge>
            )}
            
            {/* Warning: Limit reached (only if not manually closed and not past) */}
            {isFull && !isPastEvent && !event.registrationManuallyClosed && (
              <Badge variant="warning" size="md">
                Лимит достигнут
              </Badge>
            )}
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 gap-4 text-base text-muted-foreground md:grid-cols-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 flex-shrink-0" />
              <span>{formattedDateTime}</span>
            </div>
            
            {/* Location - First point with navigation */}
            {event.locations && event.locations.length > 0 && (
              <LocationHeaderItem
                location={event.locations[0]}
              />
            )}
            
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
          {registrationClosedToUser ? (
            <Button variant="secondary" disabled className="w-full sm:w-auto">
              <Lock className="mr-2 h-4 w-4" />
              Регистрация закрыта
            </Button>
          ) : (
            !isUserRegistered && (
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
              <Link href={`/events/${event.slug}/edit`}>
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
      <div className="grid gap-6 pb-24 lg:grid-cols-[2fr,1fr] lg:pb-0">
          {/* Left Column - Description, Rules, Participants */}
          <div className="min-w-0 space-y-6">
            {/* Description Card */}
            <Card id="event-description">
              <CardHeader>
                <CardTitle>Описание</CardTitle>
              </CardHeader>
              <CardContent>
                <RichTextContent html={event.description} />
              </CardContent>
            </Card>

            {/* Rules Card */}
            {event.rules && event.rules.trim().length > 0 && (
              <Card id="event-rules">
                <CardHeader>
                  <CardTitle>Правила участия</CardTitle>
                </CardHeader>
                <CardContent>
                  <RichTextContent html={event.rules} />
                </CardContent>
              </Card>
            )}

            {/* Participants Card - загружаем через Suspense */}
            {/* SSOT_EVENTS_UX_V1.1 §3: Section-level failure isolation */}
            <div id="event-participants">
              <SectionErrorBoundary sectionName="Участники">
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
              </SectionErrorBoundary>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="min-w-0 space-y-6">
            {/* Price Card */}
            {event.isPaid && (
              <Card id="event-price">
                <CardHeader>
                  <CardTitle>Стоимость участия</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-3xl font-bold leading-none text-[var(--color-text)]">
                    {event.price ?? 0} {event.currency?.symbol ?? event.currencyCode ?? ""}
                  </p>
                  <p className="text-sm text-muted-foreground">за экипаж</p>
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
                  <p className="text-sm font-medium text-muted-foreground">Тип автомобиля</p>
                  <p className="text-base font-semibold text-[var(--color-text)]">
                    {vehicleTypeLabel}
                  </p>
                </div>
                {event.allowedBrands.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Рекомендуемые марки</p>
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
                  <p className="text-base font-semibold text-[var(--color-text)]">
                    {ownerUser.name || ownerUser.telegramHandle || "Организатор"}
                  </p>
                  {ownerUser.telegramHandle && (
                    <p className="text-sm text-muted-foreground">@{ownerUser.telegramHandle}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

      {/* Owner Controls */}
      {isOwner && (
        <div className="mt-8 space-y-6">
          {/* Registration Control */}
          <div id="event-registration-control">
            <EventRegistrationControl event={event} isOwner={isOwner} />
          </div>
          
          {/* Danger Zone */}
          <div id="event-danger-zone">
            <EventDangerZone event={event} isOwner={isOwner} />
          </div>
        </div>
      )}

      {/* Mobile Section Progress */}
      <MobileSectionProgress sections={mobileSections} />
    </ScrollRestorationWrapper>
    </>
  );
}
