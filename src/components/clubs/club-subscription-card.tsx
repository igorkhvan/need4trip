/**
 * Club Subscription Card Component
 * 
 * Карточка подписки клуба с возможностью апгрейда
 */

"use client";

import { useState } from "react";
import { Crown, CheckCircle, XCircle, Calendar } from "lucide-react";
import type { ClubSubscription, ClubPlan } from "@/lib/types/club";
import { getClubPlanLabel, getClubPlanFeatures } from "@/lib/types/club";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/dates";

interface ClubSubscriptionCardProps {
  subscription: ClubSubscription;
  canManage: boolean;
  onUpgrade?: (plan: ClubPlan) => Promise<void>;
  onDowngrade?: () => Promise<void>;
}

export function ClubSubscriptionCard({
  subscription,
  canManage,
  onUpgrade,
  onDowngrade,
}: ClubSubscriptionCardProps) {
  const [loading, setLoading] = useState(false);

  const isActive = subscription.active && 
    (!subscription.validUntil || new Date(subscription.validUntil) > new Date());

  const daysUntilExpiration = subscription.validUntil
    ? Math.ceil((new Date(subscription.validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const handleUpgrade = async (plan: ClubPlan) => {
    if (!onUpgrade) return;
    
    setLoading(true);
    try {
      // В реальном приложении здесь будет интеграция с платежной системой
      const validUntil = new Date();
      validUntil.setFullYear(validUntil.getFullYear() + 1);
      await onUpgrade(plan);
    } catch (err) {
      console.error("Failed to upgrade subscription", err);
    } finally {
      setLoading(false);
    }
  };

  const getPlanColor = (plan: ClubPlan) => {
    switch (plan) {
      case "club_free":
        return "text-gray-600";
      case "club_basic":
        return "text-blue-600";
      case "club_pro":
        return "text-purple-600";
    }
  };

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className={`text-2xl font-bold ${getPlanColor(subscription.plan)} flex items-center gap-2`}>
            {subscription.plan === "club_pro" && <Crown className="w-6 h-6" />}
            {getClubPlanLabel(subscription.plan)}
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
      {subscription.validUntil && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <Calendar className="w-4 h-4" />
            <span>Действует до</span>
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {formatDate(subscription.validUntil)}
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
          {getClubPlanFeatures(subscription.plan).map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Действия (только для владельца) */}
      {canManage && (
        <div className="space-y-3 pt-4 border-t border-gray-200">
          {subscription.plan === "club_free" && (
            <>
              <button
                onClick={() => handleUpgrade("club_basic")}
                disabled={loading}
                className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Перейти на Базовый (990₽/мес)
              </button>
              <button
                onClick={() => handleUpgrade("club_pro")}
                disabled={loading}
                className="w-full px-4 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                Перейти на Про (2990₽/мес)
              </button>
            </>
          )}

          {subscription.plan === "club_basic" && (
            <>
              <button
                onClick={() => handleUpgrade("club_pro")}
                disabled={loading}
                className="w-full px-4 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                Перейти на Про (2990₽/мес)
              </button>
              <button
                onClick={onDowngrade}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Отменить подписку
              </button>
            </>
          )}

          {subscription.plan === "club_pro" && onDowngrade && (
            <button
              onClick={onDowngrade}
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Отменить подписку
            </button>
          )}
        </div>
      )}
    </div>
  );
}

