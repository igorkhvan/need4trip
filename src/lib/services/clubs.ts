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
  searchClubs as searchClubsRepo,
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
import { getClubSubscription } from "@/lib/db/subscriptionRepo";
import { ensureUserExists } from "@/lib/db/userRepo";
import { listEvents } from "@/lib/db/eventRepo";
import { hydrateCities } from "@/lib/utils/hydration";
import {
  canCreateClub as canCreateClubPermission,
  canManageClub,
  canManageClubMembers,
  canDeleteClub as canDeleteClubPermission,
} from "@/lib/services/permissions";
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
    cityId: db.city_id, // FK на cities table (normalized)
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

function mapDbClubMemberWithUserToDomain(db: DbClubMemberWithUser): ClubMemberWithUser {
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
 * Список всех клубов
 */
export async function listClubs(): Promise<Club[]> {
  const clubs = await listClubsRepo();
  const domainClubs = clubs.map(mapDbClubToDomain);
  return hydrateCities(domainClubs);
}

/**
 * Поиск клубов
 */
export async function searchClubs(query: string): Promise<Club[]> {
  if (!query.trim()) {
    return listClubs();
  }
  const clubs = await searchClubsRepo(query);
  const domainClubs = clubs.map(mapDbClubToDomain);
  return hydrateCities(domainClubs);
}

/**
 * Получить клуб по ID
 */
export async function getClub(id: string): Promise<Club> {
  const dbClub = await getClubById(id);
  if (!dbClub) {
    throw new NotFoundError("Club not found");
  }
  return mapDbClubToDomain(dbClub);
}

/**
 * Получить клуб с полными деталями (subscription, members, event count)
 */
export async function getClubWithDetails(
  id: string,
  currentUser?: CurrentUser | null
): Promise<ClubWithDetails> {
  const dbClub = await getClubById(id);
  if (!dbClub) {
    throw new NotFoundError("Club not found");
  }

  const club = mapDbClubToDomain(dbClub);

  // Load subscription
  const dbSubscription = await getClubSubscription(id);
  if (!dbSubscription) {
    throw new InternalError("Club subscription not found");
  }

  const subscription = {
    clubId: dbSubscription.club_id,
    plan: dbSubscription.plan,
    validUntil: dbSubscription.valid_until,
    active: dbSubscription.active,
    createdAt: dbSubscription.created_at,
    updatedAt: dbSubscription.updated_at,
  };

  // Load members
  const dbMembers = await listMembersWithUser(id);
  const members = dbMembers.map(mapDbClubMemberWithUserToDomain);

  // Count events
  const allEvents = await listEvents();
  const clubEvents = allEvents.filter((e) => e.club_id === id);
  const eventCount = clubEvents.length;

  // Count members
  const memberCount = await countMembers(id);

  return {
    ...club,
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
  
  const clubs = await Promise.all(
    memberships.map(async (membership) => {
      const dbClub = await getClubById(membership.club_id);
      if (!dbClub) return null;

      const club = mapDbClubToDomain(dbClub);
      
      const dbSubscription = await getClubSubscription(membership.club_id);
      const subscription = dbSubscription
        ? {
            clubId: dbSubscription.club_id,
            plan: dbSubscription.plan,
            validUntil: dbSubscription.valid_until,
            active: dbSubscription.active,
            createdAt: dbSubscription.created_at,
            updatedAt: dbSubscription.updated_at,
          }
        : {
            clubId: membership.club_id,
            plan: "club_free" as const,
            validUntil: null,
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

      const memberCount = await countMembers(membership.club_id);

      return {
        ...club,
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
  const permissionCheck = canCreateClubPermission(currentUser);
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
  // 1. Создадут club_subscription (club_free)
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
  const allEvents = await listEvents();
  const clubEvents = allEvents.filter((e) => e.club_id === id);
  const now = new Date();
  const activeEvents = clubEvents.filter((e) => new Date(e.date_time) >= now);

  if (activeEvents.length > 0) {
    throw new ConflictError(
      `Нельзя удалить клуб с активными событиями (${activeEvents.length}). Сначала удалите или завершите все события.`,
      { activeEventsCount: activeEvents.length }
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
 * Получить события клуба
 */
export async function getClubEvents(clubId: string) {
  const allEvents = await listEvents();
  return allEvents.filter((e) => e.club_id === clubId);
}

/**
 * Подсчитать активные события клуба
 */
export async function countActiveClubEvents(clubId: string): Promise<number> {
  const events = await getClubEvents(clubId);
  const now = new Date();
  return events.filter((e) => new Date(e.date_time) >= now).length;
}

// ============================================================================
// CLUB STATISTICS
// ============================================================================

/**
 * Получить статистику клуба
 */
export async function getClubStats(clubId: string) {
  const [memberCount, events] = await Promise.all([
    countMembers(clubId),
    getClubEvents(clubId),
  ]);

  const now = new Date();
  const activeEvents = events.filter((e) => new Date(e.date_time) >= now);
  const pastEvents = events.filter((e) => new Date(e.date_time) < now);

  // Подсчет участников во всех событиях клуба
  // TODO: Need4Trip: Load actual participants count from participants table
  let totalParticipants = 0;
  events.forEach((event) => {
    totalParticipants += (event as any).participantsCount ?? 0;
  });

  return {
    memberCount,
    totalEvents: events.length,
    activeEvents: activeEvents.length,
    pastEvents: pastEvents.length,
    totalParticipants,
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
  const permissionCheck = canCreateClubPermission(currentUser);
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

