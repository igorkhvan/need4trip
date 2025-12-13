import { EventCategoryDto } from "@/lib/types/eventCategory";
import { BadgeProps } from "@/components/ui/badge";
import { Car, Mountain, Users, TrendingUp, MapPin, Zap, Gauge, MoreHorizontal, LucideIcon } from "lucide-react";

/**
 * Map category code to Lucide icon
 * This matches the icons stored in the database
 */
export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  "mountain": Mountain,
  "map-pin": MapPin,
  "zap": Zap,
  "car": Car,
  "gauge": Gauge,
  "more-horizontal": MoreHorizontal,
  "users": Users,
  "trending-up": TrendingUp,
};

/**
 * Get Lucide icon component for category
 * @param category EventCategoryDto object or icon name string
 * @returns Lucide icon component
 */
export function getCategoryIcon(category: EventCategoryDto | string | null): LucideIcon {
  if (!category) return Car;
  
  const iconName = typeof category === "string" ? category : category.icon;
  return CATEGORY_ICON_MAP[iconName] || Car;
}

/**
 * Get label for category (uses Russian name)
 * @param category EventCategoryDto object or null
 * @returns Category label string
 */
export function getCategoryLabel(category: EventCategoryDto | null): string {
  if (!category) return "Другое";
  return category.nameRu;
}

/**
 * Get badge variant for category code
 * Maps to Figma Design System badge variants
 */
export const CATEGORY_BADGE_VARIANTS: Record<string, BadgeProps["variant"]> = {
  "offroad": "solid-orange",
  "touring": "solid-blue",
  "sportcars": "solid-purple",
  "classic": "solid-yellow",
  "track": "solid-cyan",
  "other": "solid-gray",
};

/**
 * Get badge variant for category
 */
export function getCategoryBadgeVariant(category: EventCategoryDto | null): BadgeProps["variant"] {
  if (!category) return "solid-gray";
  return CATEGORY_BADGE_VARIANTS[category.code] || "solid-gray";
}

// Legacy code support - these will be removed after full migration
export type EventCategoryLegacy = "weekend_trip" | "technical_ride" | "meeting" | "training" | "service_day" | "other";

export const LEGACY_CATEGORY_LABELS: Record<EventCategoryLegacy, string> = {
  weekend_trip: "Выезд на выходные",
  technical_ride: "Техническая покатушка",
  meeting: "Встреча",
  training: "Тренировка",
  service_day: "Сервис-день",
  other: "Другое",
};


