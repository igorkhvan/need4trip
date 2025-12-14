"use client";

import { Button } from "@/components/ui/button";
import { CreateClubButton } from "@/components/clubs/create-club-button";
import type { PricingPlan } from "@/lib/types/billing";

interface PricingCardButtonProps {
  plan: PricingPlan;
  isAuthenticated: boolean;
}

export function PricingCardButton({ plan, isAuthenticated }: PricingCardButtonProps) {
  const isPro = plan.id === 'club_unlimited';
  const isBasic = plan.id === 'club_50' || plan.id === 'club_500';
  const isFree = plan.id === 'free';

  if (isFree) {
    return (
      <CreateClubButton
        isAuthenticated={isAuthenticated}
        variant="outline"
        className="w-full"
        size="lg"
      >
        Начать бесплатно
      </CreateClubButton>
    );
  }

  return (
    <>
      <Button
        variant={isPro ? "default" : "secondary"}
        className="w-full"
        size="lg"
      >
        <span>Выбрать {plan.title}</span>
      </Button>
      
      {/* Additional info */}
      <p className="text-xs text-center text-[#9CA3AF] mt-4">
        Отменить можно в любое время
      </p>
    </>
  );
}

