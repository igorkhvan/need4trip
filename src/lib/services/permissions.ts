/**
 * Permissions Engine
 * 
 * Централизованная система проверки прав доступа для Need4Trip.
 * Реализует все правила из Need4Trip Bible v3.0.
 */

import type { CurrentUser } from "@/lib/auth/currentUser";
import type { Event } from "@/lib/types/event";
import type { Club, ClubRole, ClubPlan } from "@/lib/types/club";
import type { UserPlan } from "@/lib/types/user";
import { getMember } from "@/lib/db/clubMemberRepo";
import { getClubSubscription } from "@/lib/db/subscriptionRepo";
import { listEvents } from "@/lib/db/eventRepo";

// ============================================================================
// Permission Result Types
// ============================================================================

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
}

export interface EventCreationLimits {
  canCreate: boolean;
  reason?: string;
  currentCount?: number;
  maxCount?: number | null;
  requiresUpgrade?: boolean;
}

// ============================================================================
// EVENT PERMISSIONS
// ============================================================================

/**
 * Проверяет может ли пользователь создать событие
 * 
 * Правила:
 * - Free user: макс 1 активное личное событие
 * - Pro user: безлимит личных событий
 * - Club free: макс 1 активное событие клуба
 * - Club basic: макс 3 активных события клуба
 * - Club pro: безлимит событий клуба
 * - Только owner и organizer могут создавать события от клуба
 */
export async function canCreateEvent(
  user: CurrentUser | null,
  clubId: string | null,
  userPlan: UserPlan,
  clubPlan?: ClubPlan | null
): Promise<EventCreationLimits> {
  // Неавторизованные пользователи не могут создавать события
  if (!user) {
    return {
      canCreate: false,
      reason: "Необходима авторизация через Telegram для создания событий",
    };
  }

  // Личное событие (без клуба)
  if (!clubId) {
    return await canCreatePersonalEvent(user.id, userPlan);
  }

  // Событие от клуба
  return await canCreateClubEvent(user.id, clubId, clubPlan ?? "club_free");
}

/**
 * Проверка лимита личных событий
 */
async function canCreatePersonalEvent(
  userId: string,
  userPlan: UserPlan
): Promise<EventCreationLimits> {
  // Pro users - безлимит
  if (userPlan === "pro") {
    return { canCreate: true };
  }

  // Free users - макс 1 активное событие
  const maxEvents = 1;
  const currentCount = await countActivePersonalEvents(userId);

  if (currentCount >= maxEvents) {
    return {
      canCreate: false,
      reason: "Достигнут лимит активных событий для бесплатного тарифа (макс 1). Обновитесь до Pro для создания неограниченного количества событий.",
      currentCount,
      maxCount: maxEvents,
      requiresUpgrade: true,
    };
  }

  return {
    canCreate: true,
    currentCount,
    maxCount: maxEvents,
  };
}

/**
 * Проверка прав и лимита событий клуба
 */
async function canCreateClubEvent(
  userId: string,
  clubId: string,
  clubPlan: ClubPlan
): Promise<EventCreationLimits> {
  // Проверка членства в клубе
  const member = await getMember(clubId, userId);
  if (!member) {
    return {
      canCreate: false,
      reason: "Вы не являетесь участником этого клуба",
    };
  }

  // Проверка роли (только owner и organizer могут создавать события)
  if (member.role !== "owner" && member.role !== "organizer") {
    return {
      canCreate: false,
      reason: "Только владелец и организаторы клуба могут создавать события",
    };
  }

  // Проверка лимита событий клуба
  const limits: Record<ClubPlan, number | null> = {
    club_free: 1,
    club_basic: 3,
    club_pro: null, // unlimited
  };

  const maxEvents = limits[clubPlan];
  
  // Безлимит для club_pro
  if (maxEvents === null) {
    return { canCreate: true };
  }

  const currentCount = await countActiveClubEvents(clubId);

  if (currentCount >= maxEvents) {
    return {
      canCreate: false,
      reason: `Достигнут лимит активных событий для тарифа ${getPlanLabel(clubPlan)} (макс ${maxEvents}). Обновите подписку клуба для создания большего количества событий.`,
      currentCount,
      maxCount: maxEvents,
      requiresUpgrade: true,
    };
  }

  return {
    canCreate: true,
    currentCount,
    maxCount: maxEvents,
  };
}

/**
 * Проверяет может ли пользователь редактировать событие
 * 
 * Правила:
 * - Создатель события может редактировать
 * - Владелец/организатор клуба может редактировать события клуба
 */
export async function canEditEvent(
  user: CurrentUser | null,
  event: Event
): Promise<PermissionResult> {
  if (!user) {
    return {
      allowed: false,
      reason: "Необходима авторизация",
    };
  }

  // Создатель события может редактировать
  if (event.createdByUserId === user.id) {
    return { allowed: true };
  }

  // Если это событие клуба - проверить роль в клубе
  if (event.clubId) {
    const member = await getMember(event.clubId, user.id);
    if (member && (member.role === "owner" || member.role === "organizer")) {
      return { allowed: true };
    }
  }

  return {
    allowed: false,
    reason: "Недостаточно прав для редактирования события",
  };
}

/**
 * Проверяет может ли пользователь видеть событие
 * 
 * Правила:
 * - public: всегда видно всем
 * - unlisted: доступно по прямой ссылке (не показывается в списке)
 * - restricted: только участникам, членам клуба, или с явным доступом
 */
export async function canViewEvent(
  user: CurrentUser | null,
  event: Event
): Promise<PermissionResult> {
  // Public - всегда доступно
  if (event.visibility === "public") {
    return { allowed: true };
  }

  // Unlisted - доступно по прямой ссылке (любому, кто знает URL)
  if (event.visibility === "unlisted") {
    return { allowed: true };
  }

  // Restricted - требуется авторизация и проверка доступа
  if (!user) {
    return {
      allowed: false,
      reason: "Это событие доступно только авторизованным пользователям",
    };
  }

  // Создатель всегда видит свое событие
  if (event.createdByUserId === user.id) {
    return { allowed: true };
  }

  // Если событие клуба - проверить членство в клубе
  if (event.clubId) {
    const member = await getMember(event.clubId, user.id);
    if (member && member.role !== "pending") {
      return { allowed: true };
    }
  }

  // TODO: Need4Trip: Check event_user_access table for explicit access
  // TODO: Need4Trip: Check if user is participant of the event

  return {
    allowed: false,
    reason: "У вас нет доступа к этому событию",
  };
}

/**
 * Проверяет может ли пользователь использовать указанную видимость
 * 
 * Правила:
 * - Free user: только public
 * - Pro user: все visibility
 * - Club events: все visibility независимо от личного плана
 */
export function canUseVisibility(
  visibility: Event["visibility"],
  userPlan: UserPlan,
  isClubEvent: boolean
): PermissionResult {
  // Public доступно всем
  if (visibility === "public") {
    return { allowed: true };
  }

  // Для событий клубов - все visibility доступны
  if (isClubEvent) {
    return { allowed: true };
  }

  // Для личных событий: unlisted и restricted только для Pro
  if (userPlan === "free") {
    return {
      allowed: false,
      reason: "Ограниченная видимость доступна только в Pro тарифе",
    };
  }

  return { allowed: true };
}

/**
 * Проверяет может ли пользователь создать платное событие
 * 
 * Правила:
 * - Free user: только бесплатные события
 * - Pro user: платные события разрешены
 * - Club free: только бесплатные события
 * - Club basic/pro: платные события разрешены
 */
export function canCreatePaidEvent(
  userPlan: UserPlan,
  clubPlan?: ClubPlan | null,
  isClubEvent: boolean = false
): PermissionResult {
  // Для событий клубов - проверяем план клуба
  if (isClubEvent && clubPlan) {
    if (clubPlan === "club_free") {
      return {
        allowed: false,
        reason: "Платные события доступны только для клубов с тарифом Basic или Pro",
      };
    }
    return { allowed: true };
  }

  // Для личных событий - проверяем личный план
  if (userPlan === "free") {
    return {
      allowed: false,
      reason: "Платные события доступны только в Pro тарифе",
    };
  }

  return { allowed: true };
}

// ============================================================================
// CLUB PERMISSIONS
// ============================================================================

/**
 * Проверяет может ли пользователь создать клуб
 * 
 * Правила:
 * - Требуется авторизация через Telegram
 * - Нет других ограничений (любой авторизованный user может создать клуб)
 */
export function canCreateClub(user: CurrentUser | null): PermissionResult {
  if (!user) {
    return {
      allowed: false,
      reason: "Необходима авторизация через Telegram для создания клуба",
    };
  }

  return { allowed: true };
}

/**
 * Проверяет может ли пользователь управлять клубом
 * 
 * Правила:
 * - Только owner и organizer могут управлять клубом
 * - Owner имеет полные права
 * - Organizer имеет ограниченные права (не может удалить клуб, не может управлять участниками)
 */
export async function canManageClub(
  user: CurrentUser | null,
  clubId: string
): Promise<{ allowed: boolean; reason?: string; role?: ClubRole }> {
  if (!user) {
    return {
      allowed: false,
      reason: "Необходима авторизация",
    };
  }

  const member = await getMember(clubId, user.id);
  if (!member) {
    return {
      allowed: false,
      reason: "Вы не являетесь участником этого клуба",
    };
  }

  if (member.role !== "owner" && member.role !== "organizer") {
    return {
      allowed: false,
      reason: "Только владелец и организаторы могут управлять клубом",
    };
  }

  return {
    allowed: true,
    role: member.role,
  };
}

/**
 * Проверяет может ли пользователь управлять участниками клуба
 * 
 * Правила:
 * - Только owner может управлять участниками
 */
export async function canManageClubMembers(
  user: CurrentUser | null,
  clubId: string
): Promise<PermissionResult> {
  if (!user) {
    return {
      allowed: false,
      reason: "Необходима авторизация",
    };
  }

  const member = await getMember(clubId, user.id);
  if (!member || member.role !== "owner") {
    return {
      allowed: false,
      reason: "Только владелец клуба может управлять участниками",
    };
  }

  return { allowed: true };
}

/**
 * Проверяет может ли пользователь удалить клуб
 * 
 * Правила:
 * - Только owner может удалить клуб
 */
export async function canDeleteClub(
  user: CurrentUser | null,
  clubId: string
): Promise<PermissionResult> {
  if (!user) {
    return {
      allowed: false,
      reason: "Необходима авторизация",
    };
  }

  const member = await getMember(clubId, user.id);
  if (!member || member.role !== "owner") {
    return {
      allowed: false,
      reason: "Только владелец клуба может удалить клуб",
    };
  }

  return { allowed: true };
}

/**
 * Проверяет может ли пользователь управлять подпиской клуба
 * 
 * Правила:
 * - Только owner может управлять подпиской
 */
export async function canManageClubSubscription(
  user: CurrentUser | null,
  clubId: string
): Promise<PermissionResult> {
  if (!user) {
    return {
      allowed: false,
      reason: "Необходима авторизация",
    };
  }

  const member = await getMember(clubId, user.id);
  if (!member || member.role !== "owner") {
    return {
      allowed: false,
      reason: "Только владелец клуба может управлять подпиской",
    };
  }

  return { allowed: true };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Подсчет активных личных событий пользователя
 * Активное событие = date_time >= NOW() AND club_id IS NULL
 */
async function countActivePersonalEvents(userId: string): Promise<number> {
  try {
    const allEvents = await listEvents();
    const now = new Date();
    
    const activePersonalEvents = allEvents.filter(
      (event) =>
        event.created_by_user_id === userId &&
        event.club_id === null &&
        new Date(event.date_time) >= now
    );

    return activePersonalEvents.length;
  } catch (err) {
    console.error("[countActivePersonalEvents] Failed to count events", err);
    return 0;
  }
}

/**
 * Подсчет активных событий клуба
 * Активное событие = date_time >= NOW() AND club_id = clubId
 */
async function countActiveClubEvents(clubId: string): Promise<number> {
  try {
    const allEvents = await listEvents();
    const now = new Date();
    
    const activeClubEvents = allEvents.filter(
      (event) =>
        event.club_id === clubId &&
        new Date(event.date_time) >= now
    );

    return activeClubEvents.length;
  } catch (err) {
    console.error("[countActiveClubEvents] Failed to count events", err);
    return 0;
  }
}

/**
 * Получение локализованного названия плана
 */
function getPlanLabel(plan: ClubPlan): string {
  const labels: Record<ClubPlan, string> = {
    club_free: "Бесплатный",
    club_basic: "Базовый",
    club_pro: "Про",
  };
  return labels[plan];
}

/**
 * Проверка активности подписки клуба
 */
export async function isClubSubscriptionActive(clubId: string): Promise<boolean> {
  try {
    const subscription = await getClubSubscription(clubId);
    if (!subscription) return false;
    if (!subscription.active) return false;
    if (!subscription.valid_until) return true; // No expiration (club_free)
    return new Date(subscription.valid_until) > new Date();
  } catch (err) {
    console.error("[isClubSubscriptionActive] Failed to check subscription", err);
    return false;
  }
}

/**
 * Получение роли пользователя в клубе
 */
export async function getUserClubRole(
  userId: string,
  clubId: string
): Promise<ClubRole | null> {
  try {
    const member = await getMember(clubId, userId);
    return member ? member.role : null;
  } catch (err) {
    console.error("[getUserClubRole] Failed to get user role", err);
    return null;
  }
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Валидация создания события с полными проверками
 * Используется в API endpoints перед созданием события
 */
export async function validateEventCreation(
  user: CurrentUser | null,
  data: {
    clubId?: string | null;
    visibility: Event["visibility"];
    isPaid: boolean;
  }
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  if (!user) {
    errors.push("Необходима авторизация через Telegram");
    return { valid: false, errors };
  }

  const userPlan = (user as any).plan ?? "free"; // TODO: Need4Trip: Add plan to CurrentUser type
  const clubId = data.clubId ?? null;
  
  // Получить план клуба если это событие клуба
  let clubPlan: ClubPlan | null = null;
  if (clubId) {
    const subscription = await getClubSubscription(clubId);
    clubPlan = subscription?.plan ?? "club_free";
  }

  // Проверка 1: Лимит событий
  const creationCheck = await canCreateEvent(user, clubId, userPlan, clubPlan);
  if (!creationCheck.canCreate) {
    errors.push(creationCheck.reason ?? "Невозможно создать событие");
  }

  // Проверка 2: Видимость
  const visibilityCheck = canUseVisibility(data.visibility, userPlan, !!clubId);
  if (!visibilityCheck.allowed) {
    errors.push(visibilityCheck.reason ?? "Неподдерживаемая видимость события");
  }

  // Проверка 3: Платные события
  if (data.isPaid) {
    const paidCheck = canCreatePaidEvent(userPlan, clubPlan, !!clubId);
    if (!paidCheck.allowed) {
      errors.push(paidCheck.reason ?? "Платные события недоступны");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Валидация редактирования события
 */
export async function validateEventUpdate(
  user: CurrentUser | null,
  event: Event,
  updates: {
    visibility?: Event["visibility"];
    isPaid?: boolean;
    clubId?: string | null;
  }
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Проверка прав на редактирование
  const editCheck = await canEditEvent(user, event);
  if (!editCheck.allowed) {
    errors.push(editCheck.reason ?? "Недостаточно прав");
    return { valid: false, errors };
  }

  const userPlan = (user! as any).plan ?? "free"; // TODO: Need4Trip: Add plan to CurrentUser type

  // Проверка изменения visibility
  if (updates.visibility && updates.visibility !== event.visibility) {
    const newClubId = updates.clubId !== undefined ? updates.clubId : event.clubId;
    const visibilityCheck = canUseVisibility(updates.visibility, userPlan, !!newClubId);
    if (!visibilityCheck.allowed) {
      errors.push(visibilityCheck.reason ?? "Неподдерживаемая видимость");
    }
  }

  // Проверка изменения isPaid
  if (updates.isPaid !== undefined && updates.isPaid !== event.isPaid) {
    if (updates.isPaid) {
      const newClubId = updates.clubId !== undefined ? updates.clubId : event.clubId;
      let clubPlan: ClubPlan | null = null;
      if (newClubId) {
        const subscription = await getClubSubscription(newClubId);
        clubPlan = subscription?.plan ?? "club_free";
      }
      const paidCheck = canCreatePaidEvent(userPlan, clubPlan, !!newClubId);
      if (!paidCheck.allowed) {
        errors.push(paidCheck.reason ?? "Платные события недоступны");
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

