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
    <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className={`text-2xl font-bold ${getPlanColor(planId)} flex items-center gap-2`}>
            {planId === "club_unlimited" && <Crown className="w-6 h-6" />}
            {getClubPlanLabel(planId)}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
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
      {subscription.currentPeriodEnd && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <Calendar className="w-4 h-4" />
            <span>Действует до</span>
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {formatDate(subscription.currentPeriodEnd!)}
          </div>
          {daysUntilExpiration !== null && daysUntilExpiration <= 7 && daysUntilExpiration > 0 && (
            <div className="mt-2 text-sm text-orange-600">
              Осталось {daysUntilExpiration} {daysUntilExpiration === 1 ? "день" : "дней"}
            </div>
          )}
        </div>
      )}

      {/* Возможности */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Возможности тарифа:</h4>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm text-gray-600">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>Управление клубом</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-gray-600">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>Создание событий</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-gray-600">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>Управление участниками</span>
          </li>
        </ul>
      </div>

      {/* Действия */}
      {canManage && planId === "free" && (
        <div className="space-y-3 pt-4 border-t border-gray-200">
          <a
            href="/pricing"
            className="block w-full px-4 py-3 bg-blue-600 text-white text-center font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Посмотреть тарифы
          </a>
        </div>
      )}
    </div>
  );
}

