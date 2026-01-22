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

  // SSOT: SSOT_UI_COPY §2.2 - Page/Section loading: ❌ No text
  // FIX: Removed text "Загрузка тарифов...", spinner-only
  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-solid border-[#FF6F2C] border-r-transparent" />
      </div>
    );
  }

  if (error || plans.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-[#EF4444]">Ошибка загрузки тарифов</p>
      </div>
    );
  }

  return (
    <div className="py-12 md:py-16">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-3xl font-bold text-[#1F2937] md:text-4xl">Тарифы Need4Trip</h1>
        <p className="text-lg text-muted-foreground md:text-xl">
          Выберите план для вашего клуба
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm transition-shadow hover:shadow-lg"
          >
            <h2 className="mb-2 text-2xl font-bold text-[#1F2937]">{plan.title}</h2>
            
            <div className="mb-4">
              <span className="text-3xl font-bold text-[#1F2937]">
                {plan.priceMonthly === 0 ? "Free" : `${plan.priceMonthly.toLocaleString()} ${plan.currencyCode === 'KZT' ? '₸' : plan.currencyCode}`}
              </span>
              {plan.priceMonthly > 0 && (
                <span className="text-muted-foreground">/месяц</span>
              )}
            </div>

            <ul className="mb-6 space-y-2 text-sm text-[#374151]">
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
              className="w-full rounded-xl bg-[#FF6F2C] px-4 py-2 text-white transition-colors hover:bg-[#E86223] disabled:cursor-not-allowed disabled:opacity-50"
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
          <a href="mailto:support@need4trip.kz" className="text-[#FF6F2C] underline hover:text-[#E86223]">
            Свяжитесь с нами
          </a>
        </p>
      </div>
    </div>
  );
}
