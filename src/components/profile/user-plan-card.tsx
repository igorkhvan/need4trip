/**
 * User Plan Card Component
 * 
 * Карточка личного тарифа пользователя
 */

"use client";

import { useState } from "react";
import { Crown, CheckCircle, Zap } from "lucide-react";
import type { UserPlan } from "@/lib/types/user";
import { getUserPlanLabel } from "@/lib/types/user";
import { Badge } from "@/components/ui/badge";

interface UserPlanCardProps {
  plan: UserPlan;
  onUpgrade?: () => Promise<void>;
  onDowngrade?: () => Promise<void>;
}

export function UserPlanCard({ plan, onUpgrade, onDowngrade }: UserPlanCardProps) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!onUpgrade) return;
    
    setLoading(true);
    try {
      await onUpgrade();
    } catch (err) {
      console.error("Failed to upgrade plan", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDowngrade = async () => {
    if (!onDowngrade) return;
    
    setLoading(true);
    try {
      await onDowngrade();
    } catch (err) {
      console.error("Failed to downgrade plan", err);
    } finally {
      setLoading(false);
    }
  };

  const features = plan === "pro" ? [
    "Неограниченное количество личных событий",
    "Платные события",
    "Расширенные настройки видимости (unlisted, restricted)",
    "Возможность создания до 999 клубов",
    "Приоритетная поддержка",
  ] : [
    "Максимум 1 активное личное событие",
    "Только бесплатные события",
    "Только публичные события",
    "Максимум 1 клуб",
  ];

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className={`text-2xl font-bold flex items-center gap-2 ${
            plan === "pro" ? "text-purple-600" : "text-gray-600"
          }`}>
            {plan === "pro" && <Crown className="w-6 h-6" />}
            {getUserPlanLabel(plan)}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Ваш личный тариф
          </p>
        </div>

        {plan === "pro" && (
          <Badge variant="premium" size="lg">
            <Zap className="w-4 h-4 mr-1" />
            Pro
          </Badge>
        )}
      </div>

      {/* Возможности */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Возможности тарифа:</h4>
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Действия */}
      <div className="space-y-3 pt-4 border-t border-gray-200">
        {plan === "free" && onUpgrade && (
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full px-4 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <Crown className="w-5 h-5" />
            Перейти на Pro (490₽/мес)
          </button>
        )}

        {plan === "pro" && onDowngrade && (
          <button
            onClick={handleDowngrade}
            disabled={loading}
            className="w-full px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Отменить подписку
          </button>
        )}
      </div>
    </div>
  );
}

