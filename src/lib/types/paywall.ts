/**
 * Paywall Types
 * 
 * Types for paywall triggers and limitations
 */

import { z } from "zod";
import type { ClubPlanIdType } from "./clubPlan";
import type { UserPlan } from "./user";

// ============================================================================
// PAYWALL REASONS
// ============================================================================

export const PAYWALL_REASONS = {
  EVENT_LIMIT: 'event_limit_reached',
  PAID_EVENT: 'paid_event_not_allowed',
  CSV_EXPORT: 'csv_export_not_allowed',
  TELEGRAM_PRO: 'telegram_pro_not_allowed',
  CLUB_MEMBER_LIMIT: 'club_member_limit_reached',
  EVENT_PARTICIPANT_LIMIT: 'event_participant_limit_reached',
  CLUB_LIMIT: 'club_limit_reached',
  ORGANIZER_LIMIT: 'organizer_limit_reached',
  VISIBILITY_RESTRICTED: 'visibility_not_allowed',
  ANALYTICS: 'analytics_not_allowed',
} as const;

export type PaywallReason = typeof PAYWALL_REASONS[keyof typeof PAYWALL_REASONS];

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Paywall Trigger - describes why user hit a paywall
 */
export interface PaywallTrigger {
  reason: PaywallReason;
  currentPlan: ClubPlanIdType | UserPlan;
  requiredPlan: ClubPlanIdType | UserPlan;
  message: string;
  details?: {
    current?: number;
    limit?: number;
    feature?: string;
  };
}

/**
 * Paywall Response - API response when paywall is hit
 */
export interface PaywallResponse {
  paywall: PaywallTrigger;
}

/**
 * Paywall Check Context - context for checking paywall
 */
export interface PaywallCheckContext {
  userId?: string;
  clubId?: string;
  eventId?: string;
  action: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const paywallReasonSchema = z.enum([
  'event_limit_reached',
  'paid_event_not_allowed',
  'csv_export_not_allowed',
  'telegram_pro_not_allowed',
  'club_member_limit_reached',
  'event_participant_limit_reached',
  'club_limit_reached',
  'organizer_limit_reached',
  'visibility_not_allowed',
  'analytics_not_allowed',
]);

export const paywallTriggerSchema = z.object({
  reason: paywallReasonSchema,
  currentPlan: z.string(),
  requiredPlan: z.string(),
  message: z.string(),
  details: z.object({
    current: z.number().optional(),
    limit: z.number().optional(),
    feature: z.string().optional(),
  }).optional(),
});

// ============================================================================
// PAYWALL MESSAGES
// ============================================================================

/**
 * Get user-friendly message for paywall reason
 */
export function getPaywallMessage(reason: PaywallReason, details?: PaywallTrigger['details']): string {
  const messages: Record<PaywallReason, string> = {
    event_limit_reached: details?.limit 
      ? `Достигнут лимит активных событий (${details.current}/${details.limit}). Обновите план для создания новых событий.`
      : 'Достигнут лимит активных событий. Обновите план для создания новых событий.',
    
    paid_event_not_allowed: 'Платные события недоступны на вашем тарифе. Обновите план для создания платных событий.',
    
    csv_export_not_allowed: 'Экспорт участников в CSV недоступен на вашем тарифе.',
    
    telegram_pro_not_allowed: 'Расширенная интеграция с Telegram Bot доступна только на тарифе Pro.',
    
    club_member_limit_reached: details?.limit
      ? `Достигнут лимит участников клуба (${details.current}/${details.limit}).`
      : 'Достигнут лимит участников клуба.',
    
    event_participant_limit_reached: details?.limit
      ? `Достигнут лимит участников события (${details.current}/${details.limit}).`
      : 'Достигнут лимит участников события.',
    
    club_limit_reached: 'На бесплатном тарифе можно создать только один клуб. Обновите план для создания дополнительных клубов.',
    
    organizer_limit_reached: details?.limit
      ? `Достигнут лимит организаторов (${details.current}/${details.limit}). Обновите план клуба для добавления новых организаторов.`
      : 'Достигнут лимит организаторов.',
    
    visibility_not_allowed: details?.feature
      ? `Видимость "${details.feature}" недоступна на вашем тарифе.`
      : 'Эта настройка видимости недоступна на вашем тарифе.',
    
    analytics_not_allowed: 'Аналитика недоступна на вашем тарифе. Обновите план для доступа к статистике.',
  };
  
  return messages[reason];
}

/**
 * Get title for paywall modal
 */
export function getPaywallTitle(reason: PaywallReason): string {
  const titles: Record<PaywallReason, string> = {
    event_limit_reached: 'Лимит событий исчерпан',
    paid_event_not_allowed: 'Платные события недоступны',
    csv_export_not_allowed: 'CSV экспорт недоступен',
    telegram_pro_not_allowed: 'Telegram Bot Pro недоступен',
    club_member_limit_reached: 'Лимит участников',
    event_participant_limit_reached: 'Лимит участников события',
    club_limit_reached: 'Лимит клубов',
    organizer_limit_reached: 'Лимит организаторов',
    visibility_not_allowed: 'Настройки видимости',
    analytics_not_allowed: 'Аналитика недоступна',
  };
  
  return titles[reason];
}

/**
 * Get icon name for paywall reason
 */
export function getPaywallIcon(reason: PaywallReason): string {
  const icons: Record<PaywallReason, string> = {
    event_limit_reached: 'Calendar',
    paid_event_not_allowed: 'DollarSign',
    csv_export_not_allowed: 'Download',
    telegram_pro_not_allowed: 'MessageCircle',
    club_member_limit_reached: 'Users',
    event_participant_limit_reached: 'UserPlus',
    club_limit_reached: 'Building',
    organizer_limit_reached: 'UserCog',
    visibility_not_allowed: 'Eye',
    analytics_not_allowed: 'BarChart',
  };
  
  return icons[reason];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create paywall trigger
 */
export function createPaywallTrigger(
  reason: PaywallReason,
  currentPlan: ClubPlanIdType | UserPlan,
  requiredPlan: ClubPlanIdType | UserPlan,
  details?: PaywallTrigger['details']
): PaywallTrigger {
  return {
    reason,
    currentPlan,
    requiredPlan,
    message: getPaywallMessage(reason, details),
    details,
  };
}

/**
 * Check if error response is a paywall
 */
export function isPaywallResponse(response: any): response is PaywallResponse {
  return response && typeof response === 'object' && 'paywall' in response;
}

/**
 * Extract paywall from API response
 */
export async function extractPaywallFromResponse(
  response: Response
): Promise<PaywallTrigger | null> {
  if (response.status !== 402) return null;
  
  try {
    const data = await response.json();
    if (isPaywallResponse(data)) {
      return data.paywall;
    }
  } catch {
    // Not JSON or invalid
  }
  
  return null;
}

