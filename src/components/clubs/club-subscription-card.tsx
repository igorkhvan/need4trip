/**
 * Club Subscription Card Component
 * 
 * Карточка подписки клуба с возможностью апгрейда
 */

"use client";

import { useState } from "react";
import { Crown, CheckCircle, XCircle, Calendar } from "lucide-react";
import type { ClubSubscription } from "@/lib/types/billing";
import { getClubPlanLabel, getClubPlanFeatures } from "@/lib/types/club";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/dates";

interface ClubSubscriptionCardProps {
  subscription: ClubSubscription | null;  // null = free plan
  canManage: boolean;
  onUpgrade?: () => Promise<void>;
  onDowngrade?: () => Promise<void>;
}

export function ClubSubscriptionCard({
  subscription,
  canManage,
  onUpgrade,
  onDowngrade,
}: ClubSubscriptionCardProps) {
  const [loading, setLoading] = useState(false);

  // If no subscription, club is on free plan
  const planId = subscription?.planId || "free";
  const isActive = subscription ? (subscription.status === "active" || subscription.status === "pending") : true;

  // Calculate days until end (if currentPeriodEnd exists)
  const daysUntilExpiration = subscription?.currentPeriodEnd
    ? Math.ceil((new Date(subscription.currentPeriodEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const getPlanColor = (planId: string) => {
    // Support new v2.0 plan IDs
    if (planId === "club_unlimited") return "text-purple-600";
    if (planId === "club_500") return "text-blue-600";
    if (planId === "club_50") return "text-blue-600";
    if (planId === "free") return "text-gray-600";
    return "text-gray-600";
  };

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      {/* Заголовок */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className={`flex items-center gap-2 text-[24px] font-bold ${getPlanColor(planId)}`}>
            {planId === "club_unlimited" && <Crown className="h-6 w-6" />}
            {getClubPlanLabel(planId)}
          </h3>
          <p className="mt-1 text-[14px] text-[#6B7280]">
            Текущий тариф клуба
          </p>
        </div>

        {/* Статус */}
        {isActive ? (
          <Badge variant="success" size="lg">
            <CheckCircle className="w-4 h-4 mr-1" />
            Активна
          </Badge>
        ) : (
          <Badge variant="danger" size="lg">
            <XCircle className="w-4 h-4 mr-1" />
            Истекла
          </Badge>
        )}
      </div>

      {/* Срок действия */}
      {subscription?.currentPeriodEnd && (
        <div className="mb-6 rounded-xl bg-[#F9FAFB] p-4">
          <div className="mb-1 flex items-center gap-2 text-[14px] text-[#6B7280]">
            <Calendar className="h-4 w-4" />
            <span>Действует до</span>
          </div>
          <div className="text-[18px] font-semibold text-[#1F2937]">
            {formatDate(subscription.currentPeriodEnd)}
          </div>
          {daysUntilExpiration !== null && daysUntilExpiration <= 7 && daysUntilExpiration > 0 && (
            <div className="mt-2 text-[14px] text-[#EA580C]">
              Осталось {daysUntilExpiration} {daysUntilExpiration === 1 ? "день" : "дней"}
            </div>
          )}
        </div>
      )}

      {/* Возможности */}
      <div className="mb-6">
        <h4 className="mb-3 text-[14px] font-medium text-[#111827]">Возможности тарифа:</h4>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-[14px] text-[#6B7280]">
            <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#10B981]" />
            <span>Управление клубом</span>
          </li>
          <li className="flex items-start gap-2 text-[14px] text-[#6B7280]">
            <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#10B981]" />
            <span>Создание событий</span>
          </li>
          <li className="flex items-start gap-2 text-[14px] text-[#6B7280]">
            <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#10B981]" />
            <span>Управление участниками</span>
          </li>
        </ul>
      </div>

      {/* Действия */}
      {canManage && planId === "free" && (
        <div className="space-y-3 border-t border-[#E5E7EB] pt-4">
          <a
            href="/pricing"
            className="block w-full rounded-xl bg-[var(--color-primary)] px-4 py-3 text-center font-medium text-white transition-colors hover:bg-[#E86223]"
          >
            Посмотреть тарифы
          </a>
        </div>
      )}
    </div>
  );
}

