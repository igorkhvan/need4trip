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
  archiveClub as archiveClubRepo,
  unarchiveClub as unarchiveClubRepo,
  isClubArchived,
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
  getMember,
  getMemberWithUser,
  listMembers,
  listMembersWithUser,
  listUserClubs as listUserClubsRepo,
  listUserClubsWithRole,
  updateMemberRole as updateMemberRoleRepo,
  removeMember as removeMemberRepo,
  listPendingMembers as listPendingMembersRepo,
  countMembers,
  type DbClubMember,
  type DbClubMemberWithUser,
} from "@/lib/db/clubMemberRepo";
import {
  createInvite as createInviteRepo,
  type DbClubInvite,
} from "@/lib/db/clubInviteRepo";
import {
  createJoinRequest as createJoinRequestRepo,
  getJoinRequestById as getJoinRequestByIdRepo,
  listPendingJoinRequestsWithUser as listPendingJoinRequestsWithUserRepo,
  deleteJoinRequest as deleteJoinRequestRepo,
  deleteJoinRequestByClubAndUser as deleteJoinRequestByClubAndUserRepo,
  getPendingJoinRequest as getPendingJoinRequestRepo,
  approveJoinRequestTransactional as approveJoinRequestTransactionalRepo,
  type DbClubJoinRequest,
} from "@/lib/db/clubJoinRequestRepo";
import { addMember } from "@/lib/db/clubMemberRepo";
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
  type ClubInvite,
  type ClubJoinRequest,
} from "@/lib/types/club";
import { AuthError, ClubArchivedError, ConflictError, ForbiddenError, InternalError, NotFoundError, UnauthorizedError, ValidationError } from "@/lib/errors";
import type { CurrentUser } from "@/lib/auth/currentUser";
import { logClubAction } from './clubAuditLog';

// ============================================================================
// MAPPERS
// ============================================================================

function mapDbClubToDomain(db: DbClub): Club {
  // Map DB settings (snake_case) to domain settings (camelCase)
  // Per SSOT_CLUBS_DOMAIN.md §8.4
  const settings: Club['settings'] = {};
  if (db.settings) {
    const dbSettings = db.settings as Record<string, unknown>;
    if (typeof dbSettings.public_members_list_enabled === 'boolean') {
      settings.publicMembersListEnabled = dbSettings.public_members_list_enabled;
    }
    if (typeof dbSettings.public_show_owner_badge === 'boolean') {
      settings.publicShowOwnerBadge = dbSettings.public_show_owner_badge;
    }
    if (typeof dbSettings.open_join_enabled === 'boolean') {
      settings.openJoinEnabled = dbSettings.open_join_enabled;
    }
  }

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
    archivedAt: db.archived_at,
    visibility: db.visibility,
    settings,
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

function mapDbClubInviteToDomain(db: DbClubInvite): ClubInvite {
  return {
    id: db.id,
    clubId: db.club_id,
    invitedByUserId: db.invited_by_user_id,
    inviteeUserId: db.invitee_user_id,
    status: db.status,
    expiresAt: db.expires_at,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function mapDbClubJoinRequestToDomain(db: DbClubJoinRequest): ClubJoinRequest {
  return {
    id: db.id,
    clubId: db.club_id,
    requesterUserId: db.requester_user_id,
    status: db.status,
    message: db.message,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
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

// ============================================================================
// AUTHORIZATION HELPERS (SSOT: SSOT_CLUBS_DOMAIN.md §3, §A1)
// ============================================================================

/**
 * Require user to be club owner.
 * Per SSOT_CLUBS_DOMAIN.md §3.2 and Appendix A1:
 * - Only owner can manage members (invite/remove/role changes)
 * - Only owner can change visibility, settings, delete club
 * 
 * Per SSOT_ARCHITECTURE.md §20.2:
 * - 401 UnauthorizedError for unauthenticated (null userId)
 * - 403 ForbiddenError for authenticated but insufficient permission
 * 
 * @throws UnauthorizedError if user is not authenticated
 * @throws ForbiddenError if user is not owner
 */
export async function requireClubOwner(
  clubId: string,
  userId: string | null | undefined,
  action: string
): Promise<void> {
  // 401: Unauthenticated (SSOT_ARCHITECTURE.md §20.2)
  if (!userId) {
    throw new UnauthorizedError(`Требуется авторизация для: ${action}`);
  }
  
  const role = await getUserClubRole(clubId, userId);
  
  // 403: Authenticated but not owner (SSOT_ARCHITECTURE.md §20.2)
  if (role !== "owner") {
    throw new ForbiddenError(
      `Только владелец клуба может: ${action}. Текущая роль: ${role ?? "не участник"}`
    );
  }
}

/**
 * Require user to be club owner OR admin.
 * Phase 8A v1: Owner/Admin may list, approve, reject join requests.
 * 
 * Per SSOT_ARCHITECTURE.md §20.2:
 * - 401 UnauthorizedError for unauthenticated (null userId)
 * - 403 ForbiddenError for authenticated but not owner/admin
 * 
 * @throws UnauthorizedError if user is not authenticated
 * @throws ForbiddenError if user is not owner or admin
 */
export async function requireClubOwnerOrAdmin(
  clubId: string,
  userId: string | null | undefined,
  action: string
): Promise<ClubRole> {
  // 401: Unauthenticated (SSOT_ARCHITECTURE.md §20.2)
  if (!userId) {
    throw new UnauthorizedError(`Требуется авторизация для: ${action}`);
  }
  
  const role = await getUserClubRole(clubId, userId);
  
  // 403: Authenticated but not owner/admin (SSOT_ARCHITECTURE.md §20.2)
  if (role !== "owner" && role !== "admin") {
    throw new ForbiddenError(
      `Только владелец или администратор клуба может: ${action}. Текущая роль: ${role ?? "не участник"}`
    );
  }
  
  return role;
}

/**
 * Require user to be club member (non-pending).
 * Per SSOT_CLUBS_DOMAIN.md §3.3: pending has NO privileges.
 * 
 * Per SSOT_ARCHITECTURE.md §20.2:
 * - 401 UnauthorizedError for unauthenticated (null userId)
 * - 403 ForbiddenError for authenticated but not a member
 * 
 * @throws UnauthorizedError if user is not authenticated
 * @throws ForbiddenError if user is not a club member or is pending
 */
export async function requireClubMember(
  clubId: string,
  userId: string | null | undefined,
  action: string
): Promise<ClubRole> {
  // 401: Unauthenticated (SSOT_ARCHITECTURE.md §20.2)
  if (!userId) {
    throw new UnauthorizedError(`Требуется авторизация для: ${action}`);
  }
  
  const role = await getUserClubRole(clubId, userId);
  
  // 403: Authenticated but not member (or pending) (SSOT_ARCHITECTURE.md §20.2)
  if (!role || role === "pending") {
    throw new ForbiddenError(
      `Доступ только для участников клуба: ${action}. Текущая роль: ${role ?? "не участник"}`
    );
  }
  
  return role;
}

/**
 * Assert that club is NOT archived.
 * Per SSOT_CLUBS_DOMAIN.md §8.3: Archived clubs forbid all write operations except whitelist.
 * 
 * Whitelist (allowed even when archived):
 * - Read club profile (read-only)
 * - View billing status
 * - Cancel subscription
 * - Unarchive (owner-only)
 * - Self-leave (natural leave)
 * 
 * @throws ClubArchivedError (403, code: CLUB_ARCHIVED) if club is archived
 */
export async function assertClubNotArchived(
  clubId: string,
  action: string
): Promise<void> {
  const archived = await isClubArchived(clubId);
  
  if (archived) {
    throw new ClubArchivedError(
      `Клуб заархивирован. Операция "${action}" недоступна для архивированных клубов.`
    );
  }
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
 * Any authenticated user can create a club (becomes owner)
 * 
 * Per SSOT_ARCHITECTURE.md §20.2: 401 for unauthenticated
 */
export async function createClub(
  input: unknown,
  currentUser: CurrentUser | null
): Promise<Club> {
  // 401: Require authentication (SSOT_ARCHITECTURE.md §20.2)
  if (!currentUser) {
    throw new UnauthorizedError("Требуется авторизация для создания клуба");
  }

  // Валидация данных
  const parsed = clubCreateSchema.parse(input);

  // Ensure user exists in DB
  await ensureUserExists(currentUser.id, currentUser.name ?? undefined);

  // Создать клуб
  const dbClub = await createClubRepo({
    ...parsed,
    createdBy: currentUser.id,
  });

  // Триггеры БД автоматически:
  // 1. Создадут club_subscription (v2.0 format, status='active')
  // 2. Добавят created_by как owner в club_members

  const club = mapDbClubToDomain(dbClub);

  // Audit logging (fire-and-forget)
  logClubAction({
    clubId: club.id,
    actorUserId: currentUser.id,
    action: 'CLUB_CREATED',
  });

  return club;
}

/**
 * Обновить клуб
 * 
 * Per SSOT_CLUBS_DOMAIN.md §8.1:
 * - Owner + Admin may edit: description/about, rules, FAQ, contacts, media (avatar/banner)
 * - Owner-only: visibility, slug change, archive/delete, clubs.settings
 * 
 * Per SSOT_CLUBS_DOMAIN.md §8.3.2: Forbidden when archived (Edit club profile/content)
 * 
 * Per SSOT_ARCHITECTURE.md §20.2: 401 for unauthenticated, 403 for insufficient permission
 * 
 * Current schema (clubUpdateSchema) only contains content fields (name, description, 
 * cityIds, logoUrl, telegramUrl, websiteUrl) — all are admin-editable.
 * When visibility/settings are added to schema, this function must enforce owner-only.
 */
export async function updateClub(
  id: string,
  input: unknown,
  currentUser: CurrentUser | null
): Promise<Club> {
  // 401: Require authentication (SSOT_ARCHITECTURE.md §20.2)
  if (!currentUser) {
    throw new UnauthorizedError("Требуется авторизация для обновления клуба");
  }

  // SSOT_CLUBS_DOMAIN.md §8.3.2: Archived clubs forbid profile/content editing
  await assertClubNotArchived(id, "редактирование клуба");

  // Валидация данных
  const parsed = clubUpdateSchema.parse(input);

  // Get user's role in this club
  const role = await getUserClubRole(id, currentUser.id);
  
  // SSOT_CLUBS_DOMAIN.md §8.1: Owner-only fields
  // SSOT_CLUBS_DOMAIN.md §8.1: Enforce owner-only for sensitive fields
  const hasOwnerOnlyFields = 'visibility' in parsed || 'settings' in parsed || 'slug' in parsed;
  if (hasOwnerOnlyFields && role !== 'owner') {
    throw new ForbiddenError("Only the club owner can change visibility, settings, or slug.");
  }
  
  // SSOT_CLUBS_DOMAIN.md §8.1 + §A1: Content fields require owner OR admin
  // pending and member cannot edit (403)
  if (!role || role === "pending" || role === "member") {
    throw new ForbiddenError(
      `Редактирование клуба доступно только владельцу или администратору. Текущая роль: ${role ?? "не участник"}`
    );
  }

  // Обновить клуб
  const updated = await updateClubRepo(id, parsed);
  if (!updated) {
    throw new NotFoundError("Club not found");
  }

  // Audit logging
  logClubAction({
    clubId: id,
    actorUserId: currentUser.id,
    action: 'CLUB_UPDATED',
    meta: { changedFields: Object.keys(parsed) },
  });

  return mapDbClubToDomain(updated);
}

/**
 * Архивировать клуб (soft-delete)
 * Per SSOT_CLUBS_DOMAIN.md §3.2 and §8.3: Owner-only.
 * 
 * Archived clubs:
 * - Forbidden: all write operations except whitelist (§8.3.2)
 * - Allowed: read profile, view billing, cancel subscription, unarchive, self-leave (§8.3.1)
 * - Excluded from public listings
 * 
 * Idempotent: if already archived, returns success without side effects.
 */
export async function archiveClub(
  id: string,
  currentUser: CurrentUser | null
): Promise<boolean> {
  // Owner-only check (SSOT_CLUBS_DOMAIN.md §8.3)
  await requireClubOwner(id, currentUser?.id, "архивировать клуб");

  // Проверить нет ли активных событий
  const activeEventsCount = await countActiveClubEvents(id);

  if (activeEventsCount > 0) {
    throw new ConflictError(
      `Нельзя архивировать клуб с активными событиями (${activeEventsCount}). Сначала удалите или завершите все события.`,
      { activeEventsCount }
    );
  }

  // Archive club (soft-delete)
  const success = await archiveClubRepo(id);
  if (success) {
    logClubAction({
      clubId: id,
      actorUserId: currentUser!.id,
      action: 'CLUB_ARCHIVED',
    });
  }
  return success;
}

/**
 * Разархивировать клуб (restore from archive)
 * Per SSOT_CLUBS_DOMAIN.md §8.3.1: Owner-only, if supported.
 * Idempotent: if already active, returns success.
 */
export async function unarchiveClub(
  id: string,
  currentUser: CurrentUser | null
): Promise<boolean> {
  // Owner-only check
  await requireClubOwner(id, currentUser?.id, "разархивировать клуб");

  // Unarchive club
  const success = await unarchiveClubRepo(id);
  if (success) {
    logClubAction({
      clubId: id,
      actorUserId: currentUser!.id,
      action: 'CLUB_UNARCHIVED',
    });
  }
  return success;
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

// [DELETED] This function violates SSOT §5.1 by bypassing the canonical invite flow.
// It will be replaced by a proper invite-based system in Phase 3.

/**
 * Create a direct invite for a user to join a club.
 * Per SSOT_CLUBS_DOMAIN.md §5.1: Owner-only.
 * Per SSOT_CLUBS_DOMAIN.md §6.1: Idempotent per (club_id, invitee_user_id).
 * Per SSOT_CLUBS_DOMAIN.md §8.3.2: Forbidden when archived.
 */
export async function createClubInvite(
  clubId: string,
  inviteeUserId: string,
  currentUser: CurrentUser | null
): Promise<ClubInvite> {
  // SSOT §8.3.2: Archived clubs forbid invite operations
  await assertClubNotArchived(clubId, "создать приглашение");

  // SSOT §5.1: Owner-only action
  await requireClubOwner(clubId, currentUser?.id, "создать приглашение");

  // Check if the user is already a member
  const existingMember = await getMember(clubId, inviteeUserId);
  if (existingMember) {
    throw new ConflictError("Пользователь уже является участником клуба");
  }

  // Ensure the invitee user exists in the database
  await ensureUserExists(inviteeUserId);
  
  // Create invite via idempotent repository function
  const dbInvite = await createInviteRepo(clubId, currentUser!.id, inviteeUserId);

  logClubAction({
    clubId: clubId,
    actorUserId: currentUser!.id,
    action: 'INVITE_CREATED',
    targetUserId: inviteeUserId,
  });

  return mapDbClubInviteToDomain(dbInvite);
}

/**
 * Create a join request for a user to join a club.
 * 
 * Phase 8A v1 PRECONDITIONS (HARD):
 * - User is authenticated
 * - User is NOT already a club member
 * - User is NOT owner or admin of the club
 * - club.settings.openJoinEnabled === false
 * 
 * If openJoinEnabled === true: join requests MUST NOT be used (user joins directly).
 * 
 * Per SSOT_CLUBS_DOMAIN.md §5.2, §5.3
 */
export async function createClubJoinRequest(
  clubId: string,
  requesterUserId: string,
  message?: string
): Promise<ClubJoinRequest> {
  // PRECONDITION: Club must not be archived
  await assertClubNotArchived(clubId, "отправить запрос на вступление");

  // PRECONDITION: Get club to check settings
  const club = await getClubById(clubId);
  if (!club) {
    throw new NotFoundError("Клуб не найден");
  }

  // PRECONDITION: openJoinEnabled must be false
  // If openJoinEnabled === true, join requests are not used (direct join)
  const settings = club.settings as { open_join_enabled?: boolean } | null;
  if (settings?.open_join_enabled === true) {
    throw new ConflictError(
      "Этот клуб открыт для прямого вступления. Запросы на вступление не требуются."
    );
  }

  // PRECONDITION: User must not be owner/admin
  // Phase 8A: Owner/Admin NEVER submit join requests
  const existingRole = await getUserClubRole(clubId, requesterUserId);
  if (existingRole === "owner" || existingRole === "admin") {
    throw new ConflictError(
      "Владелец или администратор клуба не может отправить запрос на вступление"
    );
  }

  // PRECONDITION: User must not be already a member
  if (existingRole === "member") {
    throw new ConflictError("Вы уже являетесь участником этого клуба");
  }

  // Check for pending membership (role='pending' in club_members)
  if (existingRole === "pending") {
    throw new ConflictError("У вас уже есть ожидающий запрос на вступление");
  }

  await ensureUserExists(requesterUserId);

  const dbRequest = await createJoinRequestRepo(clubId, requesterUserId, message);
  
  // Audit logging
  logClubAction({
    clubId: clubId,
    actorUserId: requesterUserId,
    action: 'JOIN_REQUEST_CREATED',
  });
  
  return mapDbClubJoinRequestToDomain(dbRequest);
}

/**
 * List pending join requests for a club.
 * 
 * Phase 8A v1: Only Owner/Admin may list join requests.
 */
export async function listClubJoinRequests(
  clubId: string,
  currentUser: CurrentUser | null
): Promise<ClubJoinRequest[]> {
  // Owner/Admin check (Phase 8A v1)
  await requireClubOwnerOrAdmin(clubId, currentUser?.id, "просмотреть заявки на вступление");

  const dbRequests = await listPendingJoinRequestsWithUserRepo(clubId);
  
  return dbRequests.map((req) => ({
    id: req.id,
    clubId: req.club_id,
    requesterUserId: req.requester_user_id,
    status: req.status,
    message: req.message,
    createdAt: req.created_at,
    updatedAt: req.updated_at,
    user: req.user ? {
      id: req.user.id,
      name: req.user.name,
      telegramHandle: req.user.telegram_handle,
      avatarUrl: req.user.avatar_url,
    } : undefined,
  }));
}

/**
 * Approve a club join request.
 * 
 * Phase 8A v1:
 * - MUST BE TRANSACTIONAL: insert into club_members + delete join request
 * - Must be race-safe and idempotent
 * - Only Owner/Admin may approve
 * 
 * Emits audit event: JOIN_REQUEST_APPROVED
 * 
 * @returns Minimal payload (request was deleted, not updated)
 */
export async function approveClubJoinRequest(
  clubId: string,
  requestId: string,
  currentUser: CurrentUser | null
): Promise<{ success: true; requesterUserId: string }> {
  // 401: Require authentication
  if (!currentUser) {
    throw new UnauthorizedError("Требуется авторизация для одобрения заявки");
  }

  // Get join request to verify it exists and belongs to this club
  const joinRequest = await getJoinRequestByIdRepo(requestId);
  if (!joinRequest) {
    throw new NotFoundError("Заявка на вступление не найдена");
  }

  // Verify request belongs to the specified club
  if (joinRequest.club_id !== clubId) {
    throw new NotFoundError("Заявка не принадлежит указанному клубу");
  }

  // Verify request is pending
  if (joinRequest.status !== 'pending') {
    throw new ConflictError(
      `Заявка уже обработана: ${joinRequest.status}`,
      { currentStatus: joinRequest.status }
    );
  }

  // SSOT §8.3.2: Archived clubs forbid approve/reject
  await assertClubNotArchived(clubId, "одобрить заявку на вступление");

  // Phase 8A v1: Owner/Admin may approve
  await requireClubOwnerOrAdmin(clubId, currentUser.id, "одобрить заявку на вступление");

  // Phase 8A v1: TRANSACTIONAL approve (insert member + delete request)
  const { requesterUserId } = await approveJoinRequestTransactionalRepo(
    requestId,
    currentUser.id
  );

  // Audit logging
  logClubAction({
    clubId: clubId,
    actorUserId: currentUser.id,
    action: 'JOIN_REQUEST_APPROVED',
    targetUserId: requesterUserId,
    meta: { requestId },
  });

  return { success: true, requesterUserId };
}

/**
 * Reject a club join request.
 * 
 * Phase 8A v1:
 * - SILENT: delete join request without storing rejection reason
 * - User can retry after rejection (creates new request)
 * - Only Owner/Admin may reject
 * 
 * Emits audit event: JOIN_REQUEST_REJECTED
 * 
 * @returns Minimal payload (request was deleted)
 */
export async function rejectClubJoinRequest(
  clubId: string,
  requestId: string,
  currentUser: CurrentUser | null
): Promise<{ success: true; requesterUserId: string }> {
  // 401: Require authentication
  if (!currentUser) {
    throw new UnauthorizedError("Требуется авторизация для отклонения заявки");
  }

  // Get join request to verify it exists and belongs to this club
  const joinRequest = await getJoinRequestByIdRepo(requestId);
  if (!joinRequest) {
    throw new NotFoundError("Заявка на вступление не найдена");
  }

  // Verify request belongs to the specified club
  if (joinRequest.club_id !== clubId) {
    throw new NotFoundError("Заявка не принадлежит указанному клубу");
  }

  // Verify request is pending
  if (joinRequest.status !== 'pending') {
    throw new ConflictError(
      `Заявка уже обработана: ${joinRequest.status}`,
      { currentStatus: joinRequest.status }
    );
  }

  // SSOT §8.3.2: Archived clubs forbid approve/reject
  await assertClubNotArchived(clubId, "отклонить заявку на вступление");

  // Phase 8A v1: Owner/Admin may reject
  await requireClubOwnerOrAdmin(clubId, currentUser.id, "отклонить заявку на вступление");

  const requesterUserId = joinRequest.requester_user_id;

  // Phase 8A v1: SILENT reject = DELETE (no history stored)
  await deleteJoinRequestRepo(requestId);

  // Audit logging (only record in audit log, not in join_requests)
  logClubAction({
    clubId: clubId,
    actorUserId: currentUser.id,
    action: 'JOIN_REQUEST_REJECTED',
    targetUserId: requesterUserId,
    meta: { requestId },
  });

  return { success: true, requesterUserId };
}

/**
 * Cancel own join request.
 * 
 * Phase 8A v1 (OPTIONAL):
 * - User can cancel their own pending request
 * - SILENT: delete without storing
 */
export async function cancelClubJoinRequest(
  clubId: string,
  currentUser: CurrentUser | null
): Promise<{ success: true }> {
  // 401: Require authentication
  if (!currentUser) {
    throw new UnauthorizedError("Требуется авторизация для отмены заявки");
  }

  // Delete own pending request
  await deleteJoinRequestByClubAndUserRepo(clubId, currentUser.id);

  // Audit logging
  logClubAction({
    clubId: clubId,
    actorUserId: currentUser.id,
    action: 'JOIN_REQUEST_CANCELLED',
  });

  return { success: true };
}


/**
 * Изменить роль участника
 * Per SSOT_CLUBS_DOMAIN.md §7.3 and §A1: Owner-only.
 * Per SSOT_CLUBS_DOMAIN.md §7.3-7.4: 
 *   - Allowed transitions: member ↔ admin
 *   - Assigning 'owner' via role change is DISALLOWED (use ownership transfer)
 * Per SSOT_CLUBS_DOMAIN.md §8.3.2: Forbidden when archived (Role changes)
 */
export async function updateClubMemberRole(
  clubId: string,
  userId: string,
  newRole: ClubRole,
  currentUser: CurrentUser | null
): Promise<ClubMember> {
  // SSOT_CLUBS_DOMAIN.md §8.3.2: Archived clubs forbid role changes
  await assertClubNotArchived(clubId, "изменить роль участника");

  // Owner-only check (SSOT_CLUBS_DOMAIN.md §7.3)
  await requireClubOwner(clubId, currentUser?.id, "изменить роль участника");

  // SECURITY: Cannot assign 'owner' role via role change (SSOT_CLUBS_DOMAIN.md §7.3-7.4)
  // "Assigning owner via 'role change' endpoint; ownership transfer is separate (see §7.4)."
  if (newRole === "owner") {
    throw new ForbiddenError(
      "Нельзя назначить роль 'owner' через изменение роли. Используйте отдельную команду передачи владения."
    );
  }

  // Cannot modify the current owner's role
  const targetMember = await getMember(clubId, userId);
  if (!targetMember) {
    throw new NotFoundError("Участник не найден");
  }
  
  if (targetMember.role === "owner") {
    throw new ForbiddenError(
      "Нельзя изменить роль владельца клуба. Используйте передачу владения для смены владельца."
    );
  }

  // Обновить роль (only member ↔ admin transitions allowed)
  const updated = await updateMemberRoleRepo(clubId, userId, newRole);
  if (!updated) {
    throw new NotFoundError("Member not found");
  }

  return mapDbClubMemberToDomain(updated);
}

/**
 * Удалить участника из клуба
 * Per SSOT_CLUBS_DOMAIN.md §7.2 and §A1: Owner-only for removal.
 * Per SSOT_CLUBS_DOMAIN.md §7.1: Members can leave on their own (self-removal).
 * Per SSOT_ARCHITECTURE.md §20.2: 401 for unauthenticated
 * 
 * Per SSOT_CLUBS_DOMAIN.md §8.3.2:
 * - Member removal (other than natural leave): FORBIDDEN when archived
 * - Self-leave (natural leave): ALLOWED even when archived (§8.3.1 whitelist)
 */
export async function removeClubMember(
  clubId: string,
  userId: string,
  currentUser: CurrentUser | null
): Promise<boolean> {
  // 401: Require authentication (SSOT_ARCHITECTURE.md §20.2)
  if (!currentUser) {
    throw new UnauthorizedError("Требуется авторизация");
  }

  const isSelfRemoval = userId === currentUser.id;
  
  if (isSelfRemoval) {
    // Self-removal (leaving): Per SSOT_CLUBS_DOMAIN.md §7.1
    // member/admin can leave; owner cannot leave without transfer first
    // Per SSOT_CLUBS_DOMAIN.md §8.3.1: Self-leave (natural leave) is ALLOWED even when archived
    const member = await getMember(clubId, userId);
    if (!member) {
      throw new NotFoundError("Вы не являетесь участником клуба");
    }
    if (member.role === "owner") {
      throw new ForbiddenError(
        "Владелец не может покинуть клуб. Сначала передайте права владения другому участнику."
      );
    }
    return removeMemberRepo(clubId, userId);
  }
  
  // SSOT_CLUBS_DOMAIN.md §8.3.2: Owner-initiated removal is FORBIDDEN when archived
  await assertClubNotArchived(clubId, "удалить участника");
  
  // Removal by owner: Per SSOT_CLUBS_DOMAIN.md §7.2 - Owner-only
  await requireClubOwner(clubId, currentUser.id, "удалить участника");

  // Cannot remove owner
  const targetMember = await getMember(clubId, userId);
  if (!targetMember) {
    throw new NotFoundError("Участник не найден");
  }
  if (targetMember.role === "owner") {
    throw new ForbiddenError(
      "Нельзя удалить владельца клуба. Используйте передачу владения для смены владельца."
    );
  }

  return removeMemberRepo(clubId, userId);
}

// [DELETED] This function is part of a non-canonical join flow that violates SSOT §5.2 and §5.3.
// The correct flow will be implemented via the `club_join_requests` table in Phase 3.

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


