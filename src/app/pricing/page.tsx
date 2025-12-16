/**
 * Pricing Page
 * 
 * MVP: Показывает тарифы Free, Club 50, Club 500, Unlimited
 * Source: docs/BILLING_AND_LIMITS.md v2.0
 */

"use client";

import { useEffect, useState } from "react";
import { PricingPlan } from "@/lib/types/billing";
import { log } from "@/lib/utils/logger";
import { PricingCardButton } from "@/components/pricing/pricing-card-button";

export default function PricingPage() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/plans")
      .then((res) => res.json())
      .then((response) => {
        const json = response.data || response;
        if (json.plans) {
          setPlans(json.plans);
        } else {
          setError("Invalid response");
        }
      })
      .catch((err) => {
        log.error("Failed to load pricing", { err });
        setError("Failed to load pricing");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Загрузка тарифов...</p>
      </div>
    );
  }

  if (error || plans.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-destructive">Ошибка загрузки тарифов</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">Тарифы Need4Trip</h1>
        <p className="text-xl text-muted-foreground">
          Выберите план для вашего клуба
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="border rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-bold mb-2">{plan.title}</h2>
            
            <div className="mb-4">
              <span className="text-3xl font-bold">
                {plan.priceMonthlyKzt === 0 ? "Free" : `${plan.priceMonthlyKzt.toLocaleString()} ₸`}
              </span>
              {plan.priceMonthlyKzt > 0 && (
                <span className="text-muted-foreground">/месяц</span>
              )}
            </div>

            <ul className="space-y-2 text-sm mb-6">
              <li>
                <strong>Участники событий:</strong>{" "}
                {plan.maxEventParticipants === null
                  ? "Безлимит"
                  : `До ${plan.maxEventParticipants}`}
              </li>
              
              {"maxMembers" in plan && plan.maxMembers !== undefined && (
                <li>
                  <strong>Члены клуба:</strong>{" "}
                  {plan.id === "free" 
                    ? "Неприменимо"
                    : plan.maxMembers === null
                      ? "Безлимит"
                      : `До ${plan.maxMembers}`}
                </li>
              )}

              <li>
                <strong>Платные события:</strong>{" "}
                {plan.allowPaidEvents ? "✓ Да" : "✗ Нет"}
              </li>

              <li>
                <strong>CSV экспорт:</strong>{" "}
                {plan.allowCsvExport ? "✓ Да" : "✗ Нет"}
              </li>
            </ul>

            <button
              className="w-full py-2 px-4 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={plan.id === "free"}
            >
              {plan.id === "free" ? "Текущий план" : "Выбрать"}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>
          Нужна помощь с выбором?{" "}
          <a href="mailto:support@need4trip.kz" className="underline">
            Свяжитесь с нами
          </a>
        </p>
      </div>
    </div>
  );
}
