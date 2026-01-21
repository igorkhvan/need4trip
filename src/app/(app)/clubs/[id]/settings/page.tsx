/**
 * Club Settings Page (Canonical)
 * 
 * Phase 4: Billing UI v1 implementation.
 * 
 * Per SSOT_CLUBS_DOMAIN.md §3.2: Club settings is owner-only.
 * Per CLUBS_IMPLEMENTATION_BLUEPRINT v1 §5.7: Administrative configuration.
 * Per CLUBS_UI_VISUAL_CONTRACT v1 — BILLING: Billing section structure.
 * 
 * Sections:
 * 1. General Settings (placeholder)
 * 2. Billing (v1 — per Visual Contract)
 *    - Current Plan Summary
 *    - Plan Limits (read-only)
 *    - Subscription State & Actions
 * 3. Danger Zone (placeholder)
 * 
 * States:
 * - Loading → Server Component (no client-side loading)
 * - Forbidden → Redirect to /clubs/[id]
 * - Archived → Banner + read-only notice, Billing hidden
 */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Settings, CreditCard, AlertTriangle, Archive, Crown, CheckCircle, Users, Calendar, Zap, Clock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getClubBasicInfo, getUserClubRole } from "@/lib/services/clubs";
import { getClubCurrentPlan } from "@/lib/services/accessControl";
import { ClubArchivedBanner } from "../_components/club-archived-banner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ClubPlan, ClubSubscription, SubscriptionStatus } from "@/lib/types/billing";

export const dynamic = "force-dynamic";

interface ClubSettingsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClubSettingsPage({ params }: ClubSettingsPageProps) {
  const { id } = await params;

  // Load critical data
  const [user, clubResult] = await Promise.all([
    getCurrentUser(),
    getClubBasicInfo(id).catch(() => null),
  ]);

  // 404: Club not found
  if (!clubResult) {
    notFound();
  }

  const club = clubResult;

  // Auth check: must be authenticated
  if (!user) {
    redirect(`/clubs/${id}`);
  }

  // Role check: owner-only per SSOT_CLUBS_DOMAIN.md §3.2
  const userRole = await getUserClubRole(id, user.id);
  const isOwner = userRole === "owner";

  if (!isOwner) {
    redirect(`/clubs/${id}`);
  }

  // Check archived state
  const isArchived = !!club.archivedAt;

  // Load billing data (only if not archived per Visual Contract §7)
  let billingData: { planId: string; plan: ClubPlan; subscription: ClubSubscription | null } | null = null;
  if (!isArchived) {
    billingData = await getClubCurrentPlan(id);
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-subtle)]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <Link
          href={`/clubs/${id}`}
          className="inline-flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Назад к клубу
        </Link>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-text)]">Настройки клуба</h1>
          <p className="text-[var(--color-text-muted)] mt-2">
            Управление настройками клуба
          </p>
        </div>

        {/* Archived Banner - per SSOT_CLUBS_DOMAIN.md §8.3 */}
        {isArchived && (
          <div className="mb-6">
            <ClubArchivedBanner />
            <div className="mt-4 p-4 bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)] rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[var(--color-warning)] mt-0.5 flex-shrink-0" />
                <p className="text-sm text-[var(--color-warning-text)]">
                  Клуб находится в архиве. Большинство настроек недоступны для изменения.
                  Вы можете только просматривать биллинг и отменить подписку.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Section 1: General Settings (Placeholder) */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Основные настройки
            </CardTitle>
            <CardDescription>
              Настройки профиля и видимости клуба
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center text-[var(--color-text-muted)]">
              <Settings className="w-12 h-12 mx-auto mb-4 text-[var(--color-border)]" />
              <p className="text-sm">
                Раздел в разработке
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Billing (v1 — per Visual Contract) */}
        {/* Per Visual Contract §7: Billing section hidden when archived */}
        {!isArchived && billingData && (
          <BillingSection
            plan={billingData.plan}
            subscription={billingData.subscription}
          />
        )}

        {/* Section 3: Danger Zone (Placeholder) */}
        <Card className="border-[var(--color-danger-border)] mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--color-danger-text)]">
              <AlertTriangle className="w-5 h-5" />
              Опасная зона
            </CardTitle>
            <CardDescription>
              Необратимые действия с клубом
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center text-[var(--color-text-muted)]">
              <Archive className="w-12 h-12 mx-auto mb-4 text-[var(--color-border)]" />
              <p className="text-sm">
                Раздел в разработке
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// =============================================================================
// Billing Section Components (per CLUBS_UI_VISUAL_CONTRACT v1 — BILLING)
// =============================================================================

interface BillingSectionProps {
  plan: ClubPlan;
  subscription: ClubSubscription | null;
}

/**
 * BillingSection — Main billing container
 * Per Visual Contract §5: Strict section order
 */
function BillingSection({ plan, subscription }: BillingSectionProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Биллинг
        </CardTitle>
        <CardDescription>
          Управление подпиской и тарифом клуба
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 1. Current Plan Summary (blocking) */}
        <CurrentPlanSummary plan={plan} />
        
        {/* 2. Plan Limits (read-only, blocking) */}
        <PlanLimits plan={plan} />
        
        {/* 3. Subscription State & Actions (blocking) */}
        <SubscriptionStateAndActions subscription={subscription} plan={plan} />
      </CardContent>
    </Card>
  );
}

/**
 * CurrentPlanSummary — Per Visual Contract §8
 * Data source: Club context (plan reference) + GET /api/plans
 */
function CurrentPlanSummary({ plan }: { plan: ClubPlan }) {
  const isUnlimited = plan.id === "club_unlimited";
  
  return (
    <div className="p-4 rounded-lg bg-[var(--color-bg-subtle)] border border-[var(--color-border)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isUnlimited && <Crown className="w-6 h-6 text-[var(--color-info)]" />}
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text)]">
              {plan.title}
            </h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              {getPlanDescription(plan.id)}
            </p>
          </div>
        </div>
        <PlanTierBadge planId={plan.id} />
      </div>
    </div>
  );
}

/**
 * PlanLimits — Per Visual Contract §9
 * Data source: GET /api/plans
 * Rules: Read-only, no progress bars, no frontend-computed warnings
 */
function PlanLimits({ plan }: { plan: ClubPlan }) {
  const limits = [
    {
      icon: Users,
      label: "Максимум участников клуба",
      value: plan.maxMembers === null ? "Без ограничений" : plan.maxMembers.toLocaleString("ru-RU"),
    },
    {
      icon: Calendar,
      label: "Участников на событие",
      value: plan.maxEventParticipants === null ? "Без ограничений" : plan.maxEventParticipants.toLocaleString("ru-RU"),
    },
    {
      icon: Zap,
      label: "Платные события",
      value: plan.allowPaidEvents ? "Доступно" : "Недоступно",
      available: plan.allowPaidEvents,
    },
  ];

  return (
    <div className="border-t border-[var(--color-border)] pt-6">
      <h4 className="text-sm font-medium text-[var(--color-text)] mb-4">
        Лимиты тарифа
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {limits.map((limit, index) => {
          const Icon = limit.icon;
          const isFeature = "available" in limit;
          
          return (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-bg-main)] border border-[var(--color-border)]"
            >
              <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                isFeature 
                  ? (limit.available ? "text-[var(--color-success)]" : "text-[var(--color-text-muted)]")
                  : "text-[var(--color-primary)]"
              }`} />
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {limit.label}
                </p>
                <p className={`text-sm font-medium ${
                  isFeature && !limit.available 
                    ? "text-[var(--color-text-muted)]" 
                    : "text-[var(--color-text)]"
                }`}>
                  {limit.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * SubscriptionStateAndActions — Per Visual Contract §10
 * Data source: Subscription state from backend context
 * CTA Rules per §10:
 * - active → Upgrade
 * - pending → Complete payment
 * - grace → Renew
 * - expired → Renew
 */
function SubscriptionStateAndActions({ 
  subscription, 
  plan 
}: { 
  subscription: ClubSubscription | null; 
  plan: ClubPlan;
}) {
  // No subscription = FREE plan (no subscription state to show)
  if (!subscription) {
    return (
      <div className="border-t border-[var(--color-border)] pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-[var(--color-info-bg)]">
              <CreditCard className="w-5 h-5 text-[var(--color-info)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">
                Бесплатный тариф
              </p>
              <p className="text-sm text-[var(--color-text-muted)]">
                Перейдите на платный тариф для расширенных возможностей
              </p>
            </div>
          </div>
          <form action={handleBillingAction.bind(null, "upgrade")}>
            <Button type="submit">
              Выбрать тариф
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const status = subscription.status;
  const { label, variant } = getSubscriptionStatusDisplay(status);
  const ctaLabel = getCtaLabel(status);
  const ctaVariant = getCtaVariant(status);

  return (
    <div className="border-t border-[var(--color-border)] pt-6 space-y-4">
      {/* Status display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${getStatusIconBg(status)}`}>
            {getStatusIcon(status)}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-text)]">
              Статус подписки
            </p>
            <Badge variant={variant} size="sm" className="mt-1">
              {label}
            </Badge>
          </div>
        </div>
        
        {/* Period end date if available */}
        {subscription.currentPeriodEnd && (
          <div className="text-right">
            <p className="text-sm text-[var(--color-text-muted)]">
              {status === "active" ? "Действует до" : "Истекла"}
            </p>
            <p className="text-sm font-medium text-[var(--color-text)]">
              {formatPeriodDate(subscription.currentPeriodEnd)}
            </p>
          </div>
        )}
      </div>

      {/* Grace period warning */}
      {status === "grace" && subscription.graceUntil && (
        <div className="p-3 rounded-lg bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)]">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-[var(--color-warning)] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-[var(--color-warning-text)]">
                Льготный период
              </p>
              <p className="text-sm text-[var(--color-warning-text)]">
                Оплатите подписку до {formatPeriodDate(subscription.graceUntil)}, чтобы сохранить доступ
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Expired warning */}
      {status === "expired" && (
        <div className="p-3 rounded-lg bg-[var(--color-danger-bg)] border border-[var(--color-danger-border)]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[var(--color-danger)] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-[var(--color-danger-text)]">
                Подписка истекла
              </p>
              <p className="text-sm text-[var(--color-danger-text)]">
                Продлите подписку, чтобы восстановить доступ к функциям клуба
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CTA button - triggers existing billing flow */}
      <div className="flex justify-end">
        <form action={handleBillingAction.bind(null, getBillingActionType(status))}>
          <Button type="submit" variant={ctaVariant}>
            {ctaLabel}
          </Button>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// Billing Action Handler (Server Action Stub)
// =============================================================================

/**
 * Billing action handler stub.
 * Integration point for billing flow - to be wired to actual billing system.
 * 
 * @param action - "upgrade" | "renew" | "complete"
 */
async function handleBillingAction(action: string) {
  "use server";
  // TODO: Wire to actual billing flow when payment integration is ready
  // This stub ensures CTA buttons call a function, not a hardcoded route
  console.log("[Billing] Action triggered:", action);
}

/**
 * Maps subscription status to billing action type.
 */
function getBillingActionType(status: SubscriptionStatus): "upgrade" | "renew" | "complete" {
  const actionMap: Record<SubscriptionStatus, "upgrade" | "renew" | "complete"> = {
    active: "upgrade",
    pending: "complete",
    grace: "renew",
    expired: "renew",
  };
  return actionMap[status];
}

// =============================================================================
// Helper Functions
// =============================================================================

function getPlanDescription(planId: string): string {
  const descriptions: Record<string, string> = {
    free: "Базовые возможности для личных событий",
    club_50: "Для небольших клубов до 50 участников",
    club_500: "Для растущих клубов до 500 участников",
    club_unlimited: "Без ограничений для крупных организаций",
  };
  return descriptions[planId] || "Тарифный план";
}

function PlanTierBadge({ planId }: { planId: string }) {
  if (planId === "free") {
    return <Badge variant="neutral" size="md">Бесплатный</Badge>;
  }
  if (planId === "club_50") {
    return <Badge variant="info" size="md">Club 50</Badge>;
  }
  if (planId === "club_500") {
    return <Badge variant="info" size="md">Club 500</Badge>;
  }
  if (planId === "club_unlimited") {
    return <Badge variant="premium" size="md">Unlimited</Badge>;
  }
  return null;
}

function getSubscriptionStatusDisplay(status: SubscriptionStatus): { label: string; variant: "success" | "warning" | "danger" | "info" } {
  const statusMap: Record<SubscriptionStatus, { label: string; variant: "success" | "warning" | "danger" | "info" }> = {
    active: { label: "Активна", variant: "success" },
    pending: { label: "Ожидает оплаты", variant: "info" },
    grace: { label: "Льготный период", variant: "warning" },
    expired: { label: "Истекла", variant: "danger" },
  };
  return statusMap[status];
}

function getCtaLabel(status: SubscriptionStatus): string {
  const ctaMap: Record<SubscriptionStatus, string> = {
    active: "Улучшить тариф",
    pending: "Завершить оплату",
    grace: "Продлить подписку",
    expired: "Продлить подписку",
  };
  return ctaMap[status];
}

function getCtaVariant(status: SubscriptionStatus): "default" | "secondary" {
  // Active subscription = secondary (less urgent)
  // Other states = default (more urgent)
  return status === "active" ? "secondary" : "default";
}

function getStatusIcon(status: SubscriptionStatus) {
  if (status === "active") {
    return <CheckCircle className="w-5 h-5 text-[var(--color-success)]" />;
  }
  if (status === "pending") {
    return <Clock className="w-5 h-5 text-[var(--color-info)]" />;
  }
  if (status === "grace") {
    return <Clock className="w-5 h-5 text-[var(--color-warning)]" />;
  }
  return <AlertTriangle className="w-5 h-5 text-[var(--color-danger)]" />;
}

function getStatusIconBg(status: SubscriptionStatus): string {
  const bgMap: Record<SubscriptionStatus, string> = {
    active: "bg-[var(--color-success-bg)]",
    pending: "bg-[var(--color-info-bg)]",
    grace: "bg-[var(--color-warning-bg)]",
    expired: "bg-[var(--color-danger-bg)]",
  };
  return bgMap[status];
}

function formatPeriodDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
