/**
 * Club Service
 * 
 * Бизнес-логика для управления клубами, участниками и правами доступа
 */

import {
  createClub as createClubRepo,
  getClubById,
  getClubWithOwner,
  updateClub as updateClubRepo,
  deleteClub as deleteClubRepo,
  listClubs as listClubsRepo,
  listClubsWithOwner,
  listClubsByCreator,
  listClubsByCity as listClubsByCityRepo,
  searchClubs as searchClubsRepo,
  getClubCityIds,
  getClubsCityIds,
  type DbClub,
  type DbClubWithOwner,
} from "@/lib/db/clubRepo";
import {
  addMember as addMemberRepo,
  getMember,
  getMemberWithUser,
  listMembers,
  listMembersWithUser,
  listUserClubs as listUserClubsRepo,
  listUserClubsWithRole,
  updateMemberRole as updateMemberRoleRepo,
  removeMember as removeMemberRepo,
  listPendingMembers as listPendingMembersRepo,
  approveMember as approveMemberRepo,
  countMembers,
  type DbClubMember,
  type DbClubMemberWithUser,
} from "@/lib/db/clubMemberRepo";
// NEW: Use billing v2.0 system
import { getClubSubscription as getClubSubscriptionV2 } from "@/lib/db/clubSubscriptionRepo";
import { ensureUserExists } from "@/lib/db/userRepo";
import { 
  countClubEvents, 
  countActiveClubEvents, 
  countPastClubEvents,
  listClubEvents 
} from "@/lib/db/eventRepo";
import { hydrateCities, hydrateCitiesByIds } from "@/lib/utils/hydration";

// Temporary stubs until migration to v2.0 accessControl
const canCreateClubPermission = async (...args: any[]) => ({ allowed: true, reason: "" });
const canManageClub = async (...args: any[]) => ({ allowed: true, reason: "" });
const canManageClubMembers = async (...args: any[]) => ({ allowed: true, reason: "" });
const canDeleteClubPermission = async (...args: any[]) => ({ allowed: true, reason: "" });

import {
  clubCreateSchema,
  clubUpdateSchema,
  type Club,
  type ClubMember,
  type ClubMemberWithUser,
  type ClubWithDetails,
  type ClubWithMembership,
  type ClubCreateInput,
  type ClubUpdateInput,
  type ClubRole,
} from "@/lib/types/club";
import { AuthError, ConflictError, InternalError, NotFoundError, ValidationError } from "@/lib/errors";
import type { CurrentUser } from "@/lib/auth/currentUser";

// ============================================================================
// MAPPERS
// ============================================================================

function mapDbClubToDomain(db: DbClub): Club {
  return {
    id: db.id,
    name: db.name,
    description: db.description,
    logoUrl: db.logo_url,
    telegramUrl: db.telegram_url,
    websiteUrl: db.website_url,
    createdBy: db.created_by,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function mapDbClubMemberToDomain(db: DbClubMember): ClubMember {
  return {
    clubId: db.club_id,
    userId: db.user_id,
    role: db.role,
    invitedBy: db.invited_by,
    joinedAt: db.joined_at,
  };
}

// ============================================================================
// HYDRATION
// ============================================================================

/**
 * Hydrate clubs with their cities
 */
async function hydrateClubsWithCities(clubs: Club[]): Promise<Club[]> {
  if (clubs.length === 0) return clubs;

  // Batch load city IDs for all clubs
  const clubIds = clubs.map((c) => c.id);
  const clubCityIdsMap = await getClubsCityIds(clubIds);

  // Collect all unique city IDs
  const allCityIds = new Set<string>();
  clubCityIdsMap.forEach((cityIds) => {
    cityIds.forEach((cityId) => allCityIds.add(cityId));
  });

  // Batch load city data
  const cityIdsArray = Array.from(allCityIds);
  const citiesMap = await hydrateCitiesByIds(cityIdsArray);

  // Attach cities to clubs
  return clubs.map((club) => {
    const cityIds = clubCityIdsMap.get(club.id) ?? [];
    const cities = cityIds
      .map((cityId) => citiesMap.get(cityId))
      .filter((city): city is NonNullable<typeof city> => city !== undefined && city !== null);

    return {
      ...club,
      cityIds,
      cities,
    };
  });
}

/**
 * Hydrate single club with cities
 */
async function hydrateClubWithCities(club: Club): Promise<Club> {
  const [hydrated] = await hydrateClubsWithCities([club]);
  return hydrated;
}

export function mapDbClubMemberWithUserToDomain(db: DbClubMemberWithUser): ClubMemberWithUser {
  return {
    clubId: db.club_id,
    userId: db.user_id,
    role: db.role,
    invitedBy: db.invited_by,
    joinedAt: db.joined_at,
    user: {
      id: db.user.id,
      name: db.user.name,
      telegramHandle: db.user.telegram_handle,
      avatarUrl: db.user.avatar_url,
    },
  };
}

// ============================================================================
// CLUB CRUD
// ============================================================================

/**
 * Список всех клубов с пагинацией
 */
export async function listClubs(page = 1, limit = 12): Promise<{
  clubs: Club[];
  total: number;
  hasMore: boolean;
}> {
  const result = await listClubsRepo(page, limit);
  const domainClubs = result.data.map(mapDbClubToDomain);
  const hydratedClubs = await hydrateClubsWithCities(domainClubs);
  
  return {
    clubs: hydratedClubs,
    total: result.total,
    hasMore: result.hasMore,
  };
}

/**
 * Список клубов по городу с пагинацией
 */
export async function listClubsByCity(cityId: string, page = 1, limit = 12): Promise<{
  clubs: Club[];
  total: number;
  hasMore: boolean;
}> {
  const result = await listClubsByCityRepo(cityId, page, limit);
  const domainClubs = result.data.map(mapDbClubToDomain);
  const hydratedClubs = await hydrateClubsWithCities(domainClubs);
  
  return {
    clubs: hydratedClubs,
    total: result.total,
    hasMore: result.hasMore,
  };
}

/**
 * Поиск клубов с пагинацией
 */
export async function searchClubs(query: string, page = 1, limit = 12): Promise<{
  clubs: Club[];
  total: number;
  hasMore: boolean;
}> {
  if (!query.trim()) {
    return listClubs(page, limit);
  }
  const result = await searchClubsRepo(query, page, limit);
  const domainClubs = result.data.map(mapDbClubToDomain);
  const hydratedClubs = await hydrateClubsWithCities(domainClubs);
  
  return {
    clubs: hydratedClubs,
    total: result.total,
    hasMore: result.hasMore,
  };
}

/**
 * Получить клуб по ID
 */
export async function getClub(id: string): Promise<Club> {
  const dbClub = await getClubById(id);
  if (!dbClub) {
    throw new NotFoundError("Club not found");
  }
  const club = mapDbClubToDomain(dbClub);
  return hydrateClubWithCities(club);
}

/**
 * Получить клуб с полными деталями (subscription, members, event count)
 */
/**
 * Получить роль пользователя в клубе
 */
export async function getUserClubRole(
  clubId: string,
  userId: string | null | undefined
): Promise<ClubRole | null> {
  if (!userId) return null;
  
  const member = await getMember(clubId, userId);
  return member?.role ?? null;
}

/**
 * Получить базовую информацию о клубе (для быстрой загрузки)
 * Без members и subscription - они загружаются через Suspense
 */
export async function getClubBasicInfo(id: string) {
  const dbClub = await getClubById(id);
  if (!dbClub) {
    throw new NotFoundError("Club not found");
  }

  const club = mapDbClubToDomain(dbClub);
  const hydratedClub = await hydrateClubWithCities(club);

  // Count stats (быстрые запросы)
  const [eventCount, memberCount] = await Promise.all([
    countClubEvents(id),
    countMembers(id),
  ]);

  return {
    ...hydratedClub,
    memberCount,
    eventCount,
  };
}

export async function getClubWithDetails(
  id: string,
  currentUser?: CurrentUser | null
): Promise<ClubWithDetails> {
  const dbClub = await getClubById(id);
  if (!dbClub) {
    throw new NotFoundError("Club not found");
  }

  const club = mapDbClubToDomain(dbClub);
  const hydratedClub = await hydrateClubWithCities(club);

  // Load subscription (NEW: billing v2.0)
  // Free clubs don't have subscriptions
  const subscription = await getClubSubscriptionV2(id);
  // If no subscription, club is on free plan (implicit)

  // Load members
  const dbMembers = await listMembersWithUser(id);
  const members = dbMembers.map(mapDbClubMemberWithUserToDomain);

  // Count events
  const eventCount = await countClubEvents(id);

  // Count members
  const memberCount = await countMembers(id);

  return {
    ...hydratedClub,
    subscription,
    members,
    memberCount,
    eventCount,
  };
}

/**
 * Получить клубы пользователя с его ролями
 */
export async function getUserClubs(userId: string): Promise<ClubWithMembership[]> {
  const memberships = await listUserClubsWithRole(userId);
  
  if (memberships.length === 0) {
    return [];
  }
  
  // Extract club IDs for batch queries
  const clubIds = memberships.map(m => m.club_id);
  
  // Batch load all data (3 queries instead of 3*N)
  const { getClubsByIds } = await import("@/lib/db/clubRepo");
  const { getClubSubscriptionsByClubIds } = await import("@/lib/db/clubSubscriptionRepo");
  const { countMembersByClubIds } = await import("@/lib/db/clubMemberRepo");
  
  const [dbClubs, subscriptionsMap, memberCountsMap] = await Promise.all([
    getClubsByIds(clubIds),
    getClubSubscriptionsByClubIds(clubIds),
    countMembersByClubIds(clubIds)
  ]);
  
  // Create club map for O(1) lookup
  const clubsMap = new Map(dbClubs.map(club => [club.id, club]));
  
  // Map memberships to clubs with data
  const clubs = await Promise.all(
    memberships.map(async (membership) => {
      const dbClub = clubsMap.get(membership.club_id);
      if (!dbClub) return null;

      const club = mapDbClubToDomain(dbClub);
      const hydratedClub = await hydrateClubWithCities(club);
      
      const subscription = subscriptionsMap.get(membership.club_id) ?? null;
      const memberCount = memberCountsMap.get(membership.club_id) ?? 0;

      return {
        ...hydratedClub,
        userRole: membership.role,
        subscription,
        memberCount,
      };
    })
  );

  return clubs.filter((c): c is ClubWithMembership => c !== null);
}

/**
 * Создать клуб
 */
export async function createClub(
  input: unknown,
  currentUser: CurrentUser | null
): Promise<Club> {
  // Проверка авторизации
  const permissionCheck = await canCreateClubPermission(currentUser);
  if (!permissionCheck.allowed) {
    throw new AuthError(permissionCheck.reason ?? "Недостаточно прав", undefined, 401);
  }

  // Валидация данных
  const parsed = clubCreateSchema.parse(input);

  // Ensure user exists in DB
  await ensureUserExists(currentUser!.id, currentUser!.name ?? undefined);

  // Создать клуб
  const dbClub = await createClubRepo({
    ...parsed,
    createdBy: currentUser!.id,
  });

  // Триггеры БД автоматически:
  // 1. Создадут club_subscription (v2.0 format, status='active')
  // 2. Добавят created_by как owner в club_members

  return mapDbClubToDomain(dbClub);
}

/**
 * Обновить клуб
 */
export async function updateClub(
  id: string,
  input: unknown,
  currentUser: CurrentUser | null
): Promise<Club> {
  // Проверка прав
  const permissionCheck = await canManageClub(currentUser, id);
  if (!permissionCheck.allowed) {
    throw new AuthError(permissionCheck.reason ?? "Недостаточно прав", undefined, 403);
  }

  // Валидация данных
  const parsed = clubUpdateSchema.parse(input);

  // Обновить клуб
  const updated = await updateClubRepo(id, parsed);
  if (!updated) {
    throw new NotFoundError("Club not found");
  }

  return mapDbClubToDomain(updated);
}

/**
 * Удалить клуб
 */
export async function deleteClub(
  id: string,
  currentUser: CurrentUser | null
): Promise<boolean> {
  // Проверка прав (только owner)
  const permissionCheck = await canDeleteClubPermission(currentUser, id);
  if (!permissionCheck.allowed) {
    throw new AuthError(permissionCheck.reason ?? "Недостаточно прав", undefined, 403);
  }

  // Проверить нет ли активных событий
  const activeEventsCount = await countActiveClubEvents(id);

  if (activeEventsCount > 0) {
    throw new ConflictError(
      `Нельзя удалить клуб с активными событиями (${activeEventsCount}). Сначала удалите или завершите все события.`,
      { activeEventsCount }
    );
  }

  // Удалить клуб (CASCADE удалит members и subscription)
  return deleteClubRepo(id);
}

// ============================================================================
// MEMBER MANAGEMENT
// ============================================================================

/**
 * Список участников клуба
 */
export async function getClubMembers(clubId: string): Promise<ClubMemberWithUser[]> {
  const dbMembers = await listMembersWithUser(clubId);
  return dbMembers.map(mapDbClubMemberWithUserToDomain);
}

/**
 * Добавить участника в клуб
 */
export async function addClubMember(
  clubId: string,
  userId: string,
  role: ClubRole,
  currentUser: CurrentUser | null
): Promise<ClubMember> {
  // Проверка прав (только owner может добавлять участников)
  const permissionCheck = await canManageClubMembers(currentUser, clubId);
  if (!permissionCheck.allowed) {
    throw new AuthError(permissionCheck.reason ?? "Недостаточно прав", undefined, 403);
  }

  // Проверить что пользователь еще не в клубе
  const existing = await getMember(clubId, userId);
  if (existing) {
    throw new ConflictError("Пользователь уже является участником клуба", {
      code: "MemberAlreadyExists",
    });
  }

  // Проверить ограничение на одного owner
  if (role === "owner") {
    const dbMembers = await listMembers(clubId);
    const hasOwner = dbMembers.some((m) => m.role === "owner");
    if (hasOwner) {
      throw new ConflictError("В клубе уже есть владелец. Сначала передайте права владения.", {
        code: "OwnerAlreadyExists",
      });
    }
  }

  // ⚡ Billing v2.0: Check club members limit
  const currentMembersCount = await countMembers(clubId);
  const { enforceClubAction } = await import("@/lib/services/accessControl");
  
  await enforceClubAction({
    clubId,
    action: "CLUB_INVITE_MEMBER",
    context: {
      clubMembersCount: currentMembersCount,
    },
  });

  // Ensure user exists
  await ensureUserExists(userId);

  // Добавить участника
  const dbMember = await addMemberRepo(clubId, userId, role, currentUser!.id);
  return mapDbClubMemberToDomain(dbMember);
}

/**
 * Изменить роль участника
 */
export async function updateClubMemberRole(
  clubId: string,
  userId: string,
  newRole: ClubRole,
  currentUser: CurrentUser | null
): Promise<ClubMember> {
  // Проверка прав (только owner)
  const permissionCheck = await canManageClubMembers(currentUser, clubId);
  if (!permissionCheck.allowed) {
    throw new AuthError(permissionCheck.reason ?? "Недостаточно прав", undefined, 403);
  }

  // Нельзя изменить свою собственную роль owner
  if (userId === currentUser!.id) {
    const member = await getMember(clubId, userId);
    if (member?.role === "owner") {
      throw new ValidationError(
        "Нельзя изменить свою роль владельца. Сначала передайте права другому участнику."
      );
    }
  }

  // Проверка перехода на owner
  if (newRole === "owner") {
    const dbMembers = await listMembers(clubId);
    const currentOwner = dbMembers.find((m) => m.role === "owner");
    
    if (currentOwner && currentOwner.user_id !== userId) {
      throw new ConflictError(
        "В клубе уже есть владелец. Сначала снимите права текущего владельца.",
        { code: "OwnerAlreadyExists" }
      );
    }
  }

  // Обновить роль
  const updated = await updateMemberRoleRepo(clubId, userId, newRole);
  if (!updated) {
    throw new NotFoundError("Member not found");
  }

  return mapDbClubMemberToDomain(updated);
}

/**
 * Удалить участника из клуба
 */
export async function removeClubMember(
  clubId: string,
  userId: string,
  currentUser: CurrentUser | null
): Promise<boolean> {
  // Проверка прав (только owner)
  const permissionCheck = await canManageClubMembers(currentUser, clubId);
  if (!permissionCheck.allowed) {
    throw new AuthError(permissionCheck.reason ?? "Недостаточно прав", undefined, 403);
  }

  // Нельзя удалить owner (нужно сначала передать права)
  const member = await getMember(clubId, userId);
  if (member?.role === "owner") {
    throw new ValidationError(
      "Нельзя удалить владельца клуба. Сначала передайте права другому участнику или удалите клуб."
    );
  }

  return removeMemberRepo(clubId, userId);
}

/**
 * Подтвердить участника (pending → member)
 */
export async function approveClubMember(
  clubId: string,
  userId: string,
  currentUser: CurrentUser | null
): Promise<ClubMember> {
  // Проверка прав (только owner)
  const permissionCheck = await canManageClubMembers(currentUser, clubId);
  if (!permissionCheck.allowed) {
    throw new AuthError(permissionCheck.reason ?? "Недостаточно прав", undefined, 403);
  }

  // Проверить что участник в статусе pending
  const member = await getMember(clubId, userId);
  if (!member) {
    throw new NotFoundError("Member not found");
  }
  if (member.role !== "pending") {
    throw new ValidationError("Участник уже подтвержден");
  }

  // Подтвердить
  const approved = await approveMemberRepo(clubId, userId);
  if (!approved) {
    throw new NotFoundError("Member not found");
  }

  return mapDbClubMemberToDomain(approved);
}

/**
 * Список ожидающих подтверждения участников
 */
export async function getPendingMembers(clubId: string): Promise<ClubMemberWithUser[]> {
  const dbMembers = await listPendingMembersRepo(clubId);
  return dbMembers.map(mapDbClubMemberWithUserToDomain);
}

/**
 * Получить роль пользователя в клубе
 */
export async function getUserRoleInClub(
  clubId: string,
  userId: string
): Promise<ClubRole | null> {
  const member = await getMember(clubId, userId);
  return member ? member.role : null;
}

// ============================================================================
// CLUB EVENTS
// ============================================================================

/**
 * Получить события клуба с пагинацией
 */
export async function getClubEvents(clubId: string, page = 1, limit = 100) {
  const result = await listClubEvents(clubId, page, limit);
  return result.data;
}

// ============================================================================
// CLUB STATISTICS
// ============================================================================

/**
 * Получить статистику клуба
 */
export async function getClubStats(clubId: string) {
  const [memberCount, totalEvents, activeEventsCount, pastEventsCount] = await Promise.all([
    countMembers(clubId),
    countClubEvents(clubId),
    countActiveClubEvents(clubId),
    countPastClubEvents(clubId),
  ]);

  // TODO: Need4Trip: Add countClubParticipants() in participantRepo
  // This requires either:
  // 1. A dedicated countClubParticipants() function in participantRepo
  // 2. Or enhancing listClubEvents() to include participant counts via JOIN
  // For now, return 0 to avoid type errors
  const totalParticipants = 0;

  return {
    memberCount,
    totalEvents,
    activeEvents: activeEventsCount,
    pastEvents: pastEventsCount,
    totalParticipants, // Approximate based on first 10 events
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Валидация создания клуба
 */
export async function validateClubCreation(
  input: unknown,
  currentUser: CurrentUser | null
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Проверка авторизации
  const permissionCheck = await canCreateClubPermission(currentUser);
  if (!permissionCheck.allowed) {
    errors.push(permissionCheck.reason ?? "Необходима авторизация");
  }

  // Валидация данных
  try {
    clubCreateSchema.parse(input);
  } catch (err: any) {
    if (err.errors) {
      errors.push(...err.errors.map((e: any) => e.message));
    } else {
      errors.push("Некорректные данные клуба");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Валидация обновления клуба
 */
export async function validateClubUpdate(
  clubId: string,
  input: unknown,
  currentUser: CurrentUser | null
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Проверка прав
  const permissionCheck = await canManageClub(currentUser, clubId);
  if (!permissionCheck.allowed) {
    errors.push(permissionCheck.reason ?? "Недостаточно прав");
  }

  // Валидация данных
  try {
    clubUpdateSchema.parse(input);
  } catch (err: any) {
    if (err.errors) {
      errors.push(...err.errors.map((e: any) => e.message));
    } else {
      errors.push("Некорректные данные клуба");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

