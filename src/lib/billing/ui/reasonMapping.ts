/**
 * Reason → UI Copy/CTA Mapping (Russian)
 * 
 * Source of Truth: PHASE_B3-3_REASON_MESSAGE_CTA_MATRIX.md
 * 
 * This module is the SINGLE canonical owner for:
 * - User-facing messages (RU)
 * - Primary/Secondary CTAs
 * - UI patterns (modal/inline)
 * - Fallback behavior when payload is incomplete
 */

import type { PaywallDetails, PaywallOptionParsed, BillingUiPattern } from "./types";

// ============================================================================
// Types
// ============================================================================

export interface ReasonUiConfig {
  /** User message (RU) */
  message: string;
  
  /** Modal title (RU) */
  title: string;
  
  /** Primary CTA label */
  primaryCta: string;
  
  /** Secondary CTA label (optional) */
  secondaryCta?: string;
  
  /** UI pattern: modal or inline */
  uiPattern: BillingUiPattern;
  
  /**
   * Whether ONE_OFF_CREDIT is a valid option for this reason.
   * Per B3-3 Compliance Matrix.
   */
  allowOneOffCredit: boolean;
  
  /**
   * Whether CLUB_ACCESS is a valid option for this reason.
   * Per B3-3 Compliance Matrix.
   */
  allowClubAccess: boolean;
}

export interface NormalizedPaywallUi {
  /** Modal title */
  title: string;
  
  /** User message */
  message: string;
  
  /** Primary CTA configuration */
  primaryCta: {
    label: string;
    action: "pricing" | "purchase" | "club_create";
    href?: string;
  };
  
  /** Secondary CTA configuration (optional) */
  secondaryCta?: {
    label: string;
    action: "pricing" | "purchase" | "club_create";
    href?: string;
  };
  
  /** UI pattern */
  uiPattern: BillingUiPattern;
  
  /** Parsed options from payload (may be empty) */
  options: PaywallOptionParsed[];
  
  /** Additional context for rendering */
  meta: {
    currentPlanLabel?: string;
    requiredPlanLabel?: string;
    limit?: number;
    requested?: number;
    requestedParticipants?: number;
  };
}

// ============================================================================
// Reason → UI Config Map (from B3-3 Matrix)
// ============================================================================

const REASON_CONFIG: Record<string, ReasonUiConfig> = {
  SUBSCRIPTION_NOT_ACTIVE: {
    title: "Подписка не активна",
    message: "Подписка клуба неактивна. Для продолжения требуется оплата.",
    primaryCta: "Продлить подписку",
    secondaryCta: "Посмотреть тарифы",
    uiPattern: "modal",
    allowOneOffCredit: false,
    allowClubAccess: true,
  },
  
  PAID_EVENTS_NOT_ALLOWED: {
    title: "Требуется расширенный тариф",
    message: "Текущий тариф не поддерживает платные события.",
    primaryCta: "Перейти на расширенный тариф",
    uiPattern: "modal",
    allowOneOffCredit: false,
    allowClubAccess: true,
  },
  
  CSV_EXPORT_NOT_ALLOWED: {
    title: "Экспорт недоступен",
    message: "Экспорт участников недоступен на текущем тарифе.",
    primaryCta: "Перейти на расширенный тариф",
    uiPattern: "inline",  // Per B3-3: inline blocking message
    allowOneOffCredit: false,
    allowClubAccess: true,
  },
  
  MAX_EVENT_PARTICIPANTS_EXCEEDED: {
    title: "Превышен лимит участников",
    message: "Превышен лимит участников для текущего тарифа.",
    primaryCta: "Перейти на расширенный тариф",
    uiPattern: "modal",
    // Context-dependent: personal allows ONE_OFF_CREDIT, club does not
    allowOneOffCredit: true,  // Will be filtered by context
    allowClubAccess: true,
  },
  
  MAX_CLUB_MEMBERS_EXCEEDED: {
    title: "Превышен лимит организаторов",
    message: "Превышен лимит участников клуба для текущего тарифа.",
    primaryCta: "Перейти на расширенный тариф",
    uiPattern: "modal",
    allowOneOffCredit: false,
    allowClubAccess: true,
  },
  
  PUBLISH_REQUIRES_PAYMENT: {
    title: "Требуется оплата",
    // {N} will be substituted from meta.requestedParticipants
    message: "Для публикации события на {N} участников требуется оплата.",
    primaryCta: "Купить разовый доступ",
    secondaryCta: "Создать клуб",
    uiPattern: "modal",
    allowOneOffCredit: true,
    allowClubAccess: true,
  },
  
  CLUB_REQUIRED_FOR_LARGE_EVENT: {
    title: "Требуется клуб",
    message: "Для событий более 500 участников требуется клуб.",
    primaryCta: "Создать клуб",
    secondaryCta: "Посмотреть тарифы",
    uiPattern: "modal",
    // Per B3-3: ONE_OFF_CREDIT is NOT an option for >500
    allowOneOffCredit: false,
    allowClubAccess: true,
  },
  
  SUBSCRIPTION_EXPIRED: {
    title: "Срок подписки истёк",
    message: "Срок вашей подписки истёк. Продлите её, чтобы продолжить работу.",
    primaryCta: "Продлить подписку",
    secondaryCta: "Посмотреть тарифы",
    uiPattern: "modal",
    allowOneOffCredit: false,
    allowClubAccess: true,
  },
  
  CLUB_CREATION_REQUIRES_PLAN: {
    title: "Требуется тарифный план",
    message: "Для создания клуба необходимо выбрать тарифный план.",
    primaryCta: "Выбрать тариф",
    uiPattern: "modal",
    allowOneOffCredit: false,
    allowClubAccess: true,
  },
};

// Default fallback config
const DEFAULT_CONFIG: ReasonUiConfig = {
  title: "Ограничение текущего тарифа",
  message: "Эта функция недоступна на текущем тарифе.",
  primaryCta: "Посмотреть тарифы",
  uiPattern: "modal",
  allowOneOffCredit: false,
  allowClubAccess: true,
};

// ============================================================================
// Plan Labels (Subset - Full list in SSOT_BILLING)
// ============================================================================

const PLAN_LABELS: Record<string, string> = {
  free: "Бесплатный",
  club_50: "Club 50",
  club_500: "Club 500",
  club_unlimited: "Club Unlimited",
};

function getPlanLabel(planId: string | null | undefined): string | undefined {
  if (!planId) return undefined;
  return PLAN_LABELS[planId];
}

// ============================================================================
// Main Mapping Function
// ============================================================================

/**
 * Get normalized UI configuration for a PaywallDetails.
 * 
 * Implements:
 * - Reason → Message/CTA mapping (B3-3 Task 2)
 * - Fallback behavior (B3-3 Task 4)
 * - Meta substitution ({N} in messages)
 * 
 * @param details - PaywallDetails from API error
 * @param context - Additional context (clubId for pricing navigation)
 */
export function getPaywallUiConfig(
  details: PaywallDetails,
  context?: { clubId?: string }
): NormalizedPaywallUi {
  const config = REASON_CONFIG[details.reason] || DEFAULT_CONFIG;
  
  // Determine club context from payload or provided context
  const clubId = details.context?.clubId || context?.clubId;
  const isClubContext = !!clubId || !!details.currentPlanId;
  
  // Build message with substitutions
  let message = config.message;
  const metaObj = details.meta || {};
  
  // Substitute {N} with requestedParticipants
  const requestedParticipants = 
    (metaObj.requestedParticipants as number) ||
    (metaObj.requested as number) ||
    undefined;
  
  if (requestedParticipants !== undefined) {
    message = message.replace("{N}", String(requestedParticipants));
  } else {
    // Remove {N} placeholder if no data
    message = message.replace(" на {N} участников", "");
    message = message.replace("{N}", "");
  }
  
  // Build meta context for rendering
  const meta = {
    currentPlanLabel: getPlanLabel(details.currentPlanId),
    requiredPlanLabel: getPlanLabel(details.requiredPlanId),
    limit: metaObj.limit as number | undefined,
    requested: metaObj.requested as number | undefined,
    requestedParticipants,
  };
  
  // Build pricing URL with clubId if available
  const pricingHref = clubId ? `/pricing?clubId=${clubId}` : "/pricing";
  
  // Determine available options
  let options = details.options || [];
  
  // Filter options by reason's allowed types
  if (!config.allowOneOffCredit) {
    options = options.filter(o => o.type !== "ONE_OFF_CREDIT");
  }
  if (!config.allowClubAccess) {
    options = options.filter(o => o.type !== "CLUB_ACCESS");
  }
  
  // Context-dependent filtering: personal vs club
  if (isClubContext && details.reason === "MAX_EVENT_PARTICIPANTS_EXCEEDED") {
    // Club context: only CLUB_ACCESS
    options = options.filter(o => o.type === "CLUB_ACCESS");
  }
  
  // Build CTAs based on available options or fallback
  const primaryCta = buildPrimaryCta(config, details, options, pricingHref);
  const secondaryCta = config.secondaryCta 
    ? buildSecondaryCta(config, pricingHref)
    : undefined;
  
  return {
    title: config.title,
    message,
    primaryCta,
    secondaryCta,
    uiPattern: config.uiPattern,
    options,
    meta,
  };
}

/**
 * Build primary CTA configuration.
 * 
 * Fallback behavior per B3-3 Task 4:
 * - If options[] missing: use cta.href or construct URL
 * - If requiredPlanId missing: do not pre-select plan
 */
function buildPrimaryCta(
  config: ReasonUiConfig,
  details: PaywallDetails,
  options: PaywallOptionParsed[],
  pricingHref: string
): NormalizedPaywallUi["primaryCta"] {
  // If we have options, use the first one's type to determine action
  const firstOption = options[0];
  
  if (firstOption?.type === "ONE_OFF_CREDIT") {
    return {
      label: config.primaryCta,
      action: "purchase",
    };
  }
  
  if (firstOption?.type === "CLUB_ACCESS") {
    // Check if it's club creation vs upgrade
    if (details.reason === "CLUB_REQUIRED_FOR_LARGE_EVENT") {
      return {
        label: config.primaryCta,
        action: "club_create",
        href: "/pricing",  // Club creation goes through pricing
      };
    }
    return {
      label: config.primaryCta,
      action: "pricing",
      href: pricingHref,
    };
  }
  
  // Fallback: use legacy cta.href or pricing
  const href = details.cta?.href || pricingHref;
  return {
    label: config.primaryCta,
    action: "pricing",
    href,
  };
}

/**
 * Build secondary CTA configuration.
 */
function buildSecondaryCta(
  config: ReasonUiConfig,
  pricingHref: string
): NormalizedPaywallUi["secondaryCta"] {
  if (!config.secondaryCta) return undefined;
  
  // Secondary is typically "Посмотреть тарифы" or "Создать клуб"
  if (config.secondaryCta.includes("клуб")) {
    return {
      label: config.secondaryCta,
      action: "club_create",
      href: "/pricing",
    };
  }
  
  return {
    label: config.secondaryCta,
    action: "pricing",
    href: pricingHref,
  };
}

// ============================================================================
// Credit Confirmation Mapping (409)
// ============================================================================

export interface CreditConfirmationUiConfig {
  title: string;
  message: string;
  confirmCta: string;
  cancelLabel: string;
}

/**
 * Get UI configuration for Credit Confirmation modal.
 * 
 * Per B3-3 Task 3:
 * - Substitute {N} with meta.requestedParticipants
 * - Cancel = silent return (no toast, no error)
 */
export function getCreditConfirmationUiConfig(
  meta: { requestedParticipants?: number; creditCode?: string }
): CreditConfirmationUiConfig {
  // Base message with {N} placeholder
  let message = "Для сохранения события будет использован ваш разовый доступ на {N} участников.";
  
  // Substitute {N}
  if (meta.requestedParticipants !== undefined) {
    message = message.replace("{N}", String(meta.requestedParticipants));
  } else {
    // Fallback: generic message without count (B3-3 fallback)
    message = "Для сохранения события будет использован ваш разовый доступ.";
  }
  
  return {
    title: "Подтверждение публикации события",
    message,
    confirmCta: "Подтвердить и сохранить",
    cancelLabel: "Отмена",
  };
}

// ============================================================================
// Exports
// ============================================================================

export { REASON_CONFIG, DEFAULT_CONFIG, PLAN_LABELS };
