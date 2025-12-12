/**
 * Pricing Page
 * 
 * Displays club subscription plans and pricing
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { getAllClubPlans } from "@/lib/db/clubPlanRepo";
import type { ClubPlan } from "@/lib/types/clubPlan";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const plans = await getAllClubPlans();
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12">
      <div className="page-container">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <Badge variant="premium" className="mb-4">
            Тарифы
          </Badge>
          <h1 className="text-5xl font-bold text-[#0F172A]">
            Выберите план для вашего клуба
          </h1>
          <p className="text-lg text-[#6B7280] max-w-2xl mx-auto">
            Создавайте события, управляйте участниками и развивайте своё сообщество
          </p>
        </div>
        
        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} />
          ))}
        </div>
        
        {/* FAQ Section */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-[#0F172A] mb-4">
            Есть вопросы?
          </h2>
          <p className="text-[#6B7280] mb-6">
            Свяжитесь с нами в Telegram для получения консультации
          </p>
          <Button variant="outline" asChild>
            <Link href="https://t.me/need4trip_support" target="_blank">
              Написать в поддержку
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function PricingCard({ plan }: { plan: ClubPlan }) {
  const isPro = plan.id === 'club_pro';
  const isBasic = plan.id === 'club_basic';
  const isFree = plan.id === 'club_free';
  
  return (
    <Card
      id={plan.id}
      className={cn(
        "relative p-8 transition-all hover:shadow-lg",
        isPro && "border-[#FF6F2C] border-2 shadow-md"
      )}
    >
      {/* Badge for popular plan */}
      {isPro && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge variant="premium" className="bg-[#FF6F2C] text-white">
            Популярный
          </Badge>
        </div>
      )}
      
      {/* Plan Name */}
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-[#0F172A] mb-2">
          {plan.name}
        </h3>
        {plan.description && (
          <p className="text-sm text-[#6B7280]">{plan.description}</p>
        )}
      </div>
      
      {/* Price */}
      <div className="mb-6">
        {plan.priceMonthly === 0 ? (
          <div className="text-4xl font-bold text-[#0F172A]">
            Бесплатно
          </div>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-[#0F172A]">
              ₽{plan.priceMonthly.toLocaleString('ru-RU')}
            </span>
            <span className="text-lg text-[#6B7280]">/месяц</span>
          </div>
        )}
      </div>
      
      {/* Features List */}
      <ul className="space-y-3 mb-8">
        {/* Events Limit */}
        <Feature
          included={true}
          text={
            plan.maxActiveEvents === null
              ? "Неограниченное количество событий"
              : `До ${plan.maxActiveEvents} ${getEventWord(plan.maxActiveEvents)}`
          }
        />
        
        {/* Organizers */}
        <Feature
          included={true}
          text={`До ${plan.maxOrganizers} ${getOrganizerWord(plan.maxOrganizers)}`}
        />
        
        {/* Paid Events */}
        <Feature
          included={plan.allowPaidEvents}
          text="Платные события"
        />
        
        {/* CSV Export */}
        <Feature
          included={plan.allowCsvExport}
          text="Экспорт участников в CSV"
        />
        
        {/* Telegram Bot Pro */}
        <Feature
          included={plan.allowTelegramBotPro}
          text="Telegram Bot Pro"
        />
        
        {/* Analytics */}
        {plan.allowAnalyticsBasic && (
          <Feature
            included={true}
            text={plan.allowAnalyticsAdvanced ? "Расширенная аналитика" : "Базовая аналитика"}
          />
        )}
        
        {/* White Label */}
        <Feature
          included={plan.allowWhiteLabel}
          text="White Label брендинг"
        />
        
        {/* Subdomain */}
        <Feature
          included={plan.allowSubdomain}
          text="Персональный поддомен"
        />
        
        {/* API Access */}
        <Feature
          included={plan.allowApiAccess}
          text="API доступ"
        />
      </ul>
      
      {/* CTA Button */}
      <Button
        variant={isPro ? "default" : isBasic ? "secondary" : "outline"}
        className="w-full"
        size="lg"
        asChild={isFree}
      >
        {isFree ? (
          <Link href="/clubs/create">
            Начать бесплатно
          </Link>
        ) : (
          <span>Выбрать {plan.name}</span>
        )}
      </Button>
      
      {/* Additional info */}
      {!isFree && (
        <p className="text-xs text-center text-[#9CA3AF] mt-4">
          Отменить можно в любое время
        </p>
      )}
    </Card>
  );
}

interface FeatureProps {
  included: boolean;
  text: string;
}

function Feature({ included, text }: FeatureProps) {
  return (
    <li className="flex items-start gap-3">
      {included ? (
        <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
      ) : (
        <X className="h-5 w-5 text-gray-300 shrink-0 mt-0.5" />
      )}
      <span
        className={cn(
          "text-sm",
          included ? "text-[#111827]" : "text-[#9CA3AF] line-through"
        )}
      >
        {text}
      </span>
    </li>
  );
}

// Helper functions for word forms
function getEventWord(count: number): string {
  if (count === 1) return "событие";
  if (count >= 2 && count <= 4) return "события";
  return "событий";
}

function getOrganizerWord(count: number): string {
  if (count === 1) return "организатор";
  if (count >= 2 && count <= 4) return "организатора";
  return "организаторов";
}

