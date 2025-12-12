import { z } from "zod";
import { CityHydrated } from "./city";

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
  cityId: string | null; // FK на cities table (normalized)
  city?: CityHydrated | null; // Hydrated city info
  carBrandId: string | null; // FK на car_brands table (normalized)
  carBrand?: { id: string; name: string } | null; // Hydrated brand info
  carModelText: string | null; // Свободный текст модели (например: "Land Cruiser 200")
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

// ============================================================================
// PROFILE UPDATE
// ============================================================================

/**
 * Profile update input schema
 */
export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1, "Имя обязательно").max(100),
  cityId: z.string().uuid("Выберите город из списка"),
  carBrandId: z.string().uuid().nullable(),
  carModelText: z.string().trim().max(100).nullable(),
  carYear: z.number().int().min(1900).max(2100).nullable().optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
