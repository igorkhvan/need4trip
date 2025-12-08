import { EventCategory } from "@/lib/types/event";
import { BadgeProps } from "@/components/ui/badge";
import { Car, Mountain, Users, TrendingUp, LucideIcon } from "lucide-react";

/**
 * Маппинг категорий событий на человекочитаемые названия
 */
export const CATEGORY_LABELS: Record<EventCategory, string> = {
  weekend_trip: "Выезд на выходные",
  technical_ride: "Техническая покатушка",
  meeting: "Встреча",
  training: "Тренировка",
  service_day: "Сервис-день",
  other: "Другое",
};

/**
 * Опции категорий для Select компонента
 */
export const CATEGORY_OPTIONS: { value: EventCategory; label: string }[] = [
  { value: "weekend_trip", label: "Выезд на выходные" },
  { value: "technical_ride", label: "Техническая покатушка" },
  { value: "meeting", label: "Встреча" },
  { value: "training", label: "Тренировка" },
  { value: "service_day", label: "Сервис-день" },
  { value: "other", label: "Другое" },
];

/**
 * Маппинг категорий событий на Solid Badge варианты
 * Согласно Figma Design System
 */
export const CATEGORY_BADGE_VARIANTS: Record<EventCategory, BadgeProps["variant"]> = {
  weekend_trip: "solid-orange",
  technical_ride: "solid-blue",
  meeting: "solid-purple",
  training: "solid-yellow",
  service_day: "solid-cyan",
  other: "solid-gray",
};

/**
 * Получить badge вариант для категории события
 */
export function getCategoryBadgeVariant(category: EventCategory): BadgeProps["variant"] {
  return CATEGORY_BADGE_VARIANTS[category] || "solid-gray";
}

/**
 * Маппинг категорий событий на иконки Lucide
 */
export const CATEGORY_ICONS: Record<EventCategory, LucideIcon> = {
  weekend_trip: Mountain,
  technical_ride: Car,
  meeting: Users,
  training: TrendingUp,
  service_day: Car,
  other: Car,
};

/**
 * Получить label для категории события
 */
export function getCategoryLabel(category: EventCategory): string {
  return CATEGORY_LABELS[category] || "Другое";
}

/**
 * Получить иконку для категории события
 */
export function getCategoryIcon(category: EventCategory): LucideIcon {
  return CATEGORY_ICONS[category] || Car;
}

