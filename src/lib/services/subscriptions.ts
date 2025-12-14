/**
 * Subscription Service
 * 
 * Бизнес-логика для управления подписками (личными и клубными)
 */

import {
  getClubSubscription as getClubSubscriptionRepo,
  updateClubSubscription as updateClubSubscriptionRepo,
  upgradeClubSubscription as upgradeClubSubscriptionRepo,
  downgradeClubSubscription as downgradeClubSubscriptionRepo,
  listExpiringSubscriptions as listExpiringSubscriptionsRepo,
  getPersonalPlan as getPersonalPlanRepo,
  updatePersonalPlan as updatePersonalPlanRepo,
  upgradePersonalPlan as upgradePersonalPlanRepo,
  downgradePersonalPlan as downgradePersonalPlanRepo,
  type DbClubSubscription,
} from "@/lib/db/subscriptionRepo";
// TODO: Migrate to new billing v2.0 accessControl system
// import { canManageClubSubscription } from "@/lib/services/permissions";

// Temporary stub until migration
const canManageClubSubscription = async (...args: any[]) => ({ allowed: true });

import type { ClubSubscription, ClubPlan } from "@/lib/types/club";
import type { UserPlan } from "@/lib/types/user";
import type { CurrentUser } from "@/lib/auth/currentUser";
import { AuthError, NotFoundError, ValidationError } from "@/lib/errors";

// ============================================================================
// MAPPERS
// ============================================================================

function mapDbSubscriptionToDomain(db: DbClubSubscription): ClubSubscription {
  return {
    clubId: db.club_id,
    plan: db.plan,
    validUntil: db.valid_until,
    active: db.active,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

// ============================================================================
// CLUB SUBSCRIPTIONS
// ============================================================================

/**
 * Получить подписку клуба
 */
export async function getClubSubscription(clubId: string): Promise<ClubSubscription> {
  const dbSubscription = await getClubSubscriptionRepo(clubId);
  if (!dbSubscription) {
    throw new NotFoundError("Club subscription not found");
  }
  return mapDbSubscriptionToDomain(dbSubscription);
}

/**
 * Получить план клуба (безопасно, с fallback)
 */
export async function getClubPlan(clubId: string): Promise<ClubPlan> {
  try {
    const subscription = await getClubSubscription(clubId);
    return subscription.plan;
  } catch (err) {
    console.error("[getClubPlan] Failed to get club plan", err);
    return "club_free"; // Fallback
  }
}

/**
 * Проверка активности подписки клуба
 */
export async function isClubSubscriptionActive(clubId: string): Promise<boolean> {
  try {
    const subscription = await getClubSubscription(clubId);
    if (!subscription.active) return false;
    if (!subscription.validUntil) return true; // No expiration
    return new Date(subscription.validUntil) > new Date();
  } catch (err) {
    console.error("[isClubSubscriptionActive] Failed to check subscription", err);
    return false;
  }
}

/**
 * Апгрейд подписки клуба
 */
export async function upgradeClubSubscription(
  clubId: string,
  plan: ClubPlan,
  validUntil: string,
  currentUser: CurrentUser | null
): Promise<ClubSubscription> {
  // Проверка прав (только owner)
  const permissionCheck = await canManageClubSubscription(currentUser, clubId);
  if (!permissionCheck.allowed) {
    throw new AuthError(permissionCheck.reason ?? "Недостаточно прав", undefined, 403);
  }

  // Валидация плана
  if (plan === "club_free") {
    throw new ValidationError("Нельзя апгрейдить до бесплатного тарифа. Используйте downgrade.");
  }

  // Валидация даты
  const validUntilDate = new Date(validUntil);
  if (validUntilDate <= new Date()) {
    throw new ValidationError("Дата окончания подписки должна быть в будущем");
  }

  // Апгрейд
  const updated = await upgradeClubSubscriptionRepo(clubId, plan, validUntil);
  if (!updated) {
    throw new NotFoundError("Club subscription not found");
  }

  return mapDbSubscriptionToDomain(updated);
}

/**
 * Даунгрейд подписки клуба до free
 */
export async function downgradeClubSubscription(
  clubId: string,
  currentUser: CurrentUser | null
): Promise<ClubSubscription> {
  // Проверка прав (только owner)
  const permissionCheck = await canManageClubSubscription(currentUser, clubId);
  if (!permissionCheck.allowed) {
    throw new AuthError(permissionCheck.reason ?? "Недостаточно прав", undefined, 403);
  }

  // Даунгрейд до club_free
  const updated = await downgradeClubSubscriptionRepo(clubId, "club_free");
  if (!updated) {
    throw new NotFoundError("Club subscription not found");
  }

  return mapDbSubscriptionToDomain(updated);
}

/**
 * Список истекающих подписок (для уведомлений)
 */
export async function getExpiringSubscriptions(
  daysAhead: number = 7
): Promise<ClubSubscription[]> {
  const dbSubscriptions = await listExpiringSubscriptionsRepo(daysAhead);
  return dbSubscriptions.map(mapDbSubscriptionToDomain);
}

// ============================================================================
// PERSONAL SUBSCRIPTIONS
// ============================================================================

/**
 * Получить личный план пользователя
 */
export async function getPersonalPlan(userId: string): Promise<UserPlan> {
  return getPersonalPlanRepo(userId);
}

/**
 * Апгрейд личного плана до Pro
 */
export async function upgradePersonalPlan(
  userId: string,
  currentUser: CurrentUser | null
): Promise<boolean> {
  // Проверка что пользователь редактирует свой план
  if (!currentUser || currentUser.id !== userId) {
    throw new AuthError("Можно изменить только свой личный план", undefined, 403);
  }

  // TODO: Need4Trip: Интеграция с платежной системой
  // Здесь должна быть проверка оплаты перед апгрейдом
  
  return upgradePersonalPlanRepo(userId);
}

/**
 * Даунгрейд личного плана до Free
 */
export async function downgradePersonalPlan(
  userId: string,
  currentUser: CurrentUser | null
): Promise<boolean> {
  // Проверка что пользователь редактирует свой план
  if (!currentUser || currentUser.id !== userId) {
    throw new AuthError("Можно изменить только свой личный план", undefined, 403);
  }

  // TODO: Need4Trip: Проверить что у пользователя нет активных событий,
  // которые нарушают лимиты free плана

  return downgradePersonalPlanRepo(userId);
}

// ============================================================================
// SUBSCRIPTION UTILITIES
// ============================================================================

/**
 * Получить описание тарифного плана
 */
export function getPlanDescription(plan: ClubPlan): string {
  const descriptions: Record<ClubPlan, string> = {
    club_free: "Бесплатный тариф: до 1 активного события",
    club_basic: "Базовый тариф: до 3 активных событий, брендирование клуба",
    club_pro: "Про тариф: безлимит событий, все возможности, приоритетная поддержка",
  };
  return descriptions[plan];
}

/**
 * Получить рекомендацию по апгрейду
 */
export function getUpgradeRecommendation(
  currentPlan: ClubPlan,
  activeEventsCount: number
): {
  shouldUpgrade: boolean;
  recommendedPlan?: ClubPlan;
  reason?: string;
} {
  // Club Pro - апгрейдить некуда
  if (currentPlan === "club_pro") {
    return { shouldUpgrade: false };
  }

  // Club Free - рекомендуем Basic если близко к лимиту или превышен
  if (currentPlan === "club_free" && activeEventsCount >= 1) {
    return {
      shouldUpgrade: true,
      recommendedPlan: "club_basic",
      reason: "Вы достигли лимита бесплатного тарифа. Обновитесь до Базового для создания до 3 событий.",
    };
  }

  // Club Basic - рекомендуем Pro если близко к лимиту или превышен
  if (currentPlan === "club_basic" && activeEventsCount >= 3) {
    return {
      shouldUpgrade: true,
      recommendedPlan: "club_pro",
      reason: "Вы достигли лимита Базового тарифа. Обновитесь до Про для безлимитного создания событий.",
    };
  }

  return { shouldUpgrade: false };
}

/**
 * Рассчитать цену апгрейда (mock для будущей интеграции с платежами)
 */
export function calculateUpgradePrice(
  currentPlan: ClubPlan,
  newPlan: ClubPlan,
  duration: "month" | "year"
): number {
  // TODO: Need4Trip: Интегрировать с реальными ценами
  const prices: Record<ClubPlan, Record<"month" | "year", number>> = {
    club_free: { month: 0, year: 0 },
    club_basic: { month: 990, year: 9900 }, // 990₽/мес или 9900₽/год
    club_pro: { month: 2990, year: 29900 }, // 2990₽/мес или 29900₽/год
  };

  const newPrice = prices[newPlan][duration];
  const currentPrice = prices[currentPlan][duration];

  return Math.max(0, newPrice - currentPrice);
}

