import { z } from "zod";

export type ExperienceLevel = "beginner" | "intermediate" | "pro";

// Personal subscription plans
export const userPlanSchema = z.enum(["free", "pro"]);
export type UserPlan = z.infer<typeof userPlanSchema>;

export interface User {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  telegramHandle: string | null;
  telegramId?: string | null;
  avatarUrl?: string | null;
  carModel: string | null;
  experienceLevel: ExperienceLevel | null;
  plan?: UserPlan; // Personal subscription plan (free by default)
  createdAt: string;
  updatedAt: string;
}

/**
 * Get localized label for user plan
 */
export function getUserPlanLabel(plan: UserPlan): string {
  const labels: Record<UserPlan, string> = {
    free: "Бесплатный",
    pro: "Про",
  };
  return labels[plan];
}

/**
 * Get plan features description
 */
export function getUserPlanFeatures(plan: UserPlan): string[] {
  const features: Record<UserPlan, string[]> = {
    free: [
      "Максимум 1 активное событие",
      "Только публичные события",
      "Только бесплатные события",
      "Базовые функции регистрации",
    ],
    pro: [
      "Безлимит активных событий",
      "Все уровни видимости (public, unlisted, restricted)",
      "Платные события",
      "Расширенные настройки событий",
      "Приоритетная поддержка",
    ],
  };
  return features[plan];
}

/**
 * Check if user can create paid events
 */
export function canCreatePaidEvents(plan: UserPlan): boolean {
  return plan === "pro";
}

/**
 * Check if user can use restricted visibility
 */
export function canUseRestrictedVisibility(plan: UserPlan): boolean {
  return plan === "pro";
}

/**
 * Get max active personal events for plan
 */
export function getMaxActivePersonalEventsForPlan(plan: UserPlan): number | null {
  const limits: Record<UserPlan, number | null> = {
    free: 1,
    pro: null, // unlimited
  };
  return limits[plan];
}
