"use client";

import { Button } from "@/components/ui/button";
import { CreateClubButton } from "@/components/clubs/create-club-button";
import type { ClubPlan } from "@/lib/types/clubPlan";

interface PricingCardButtonProps {
  plan: ClubPlan;
  isAuthenticated: boolean;
}

export function PricingCardButton({ plan, isAuthenticated }: PricingCardButtonProps) {
  const isPro = plan.id === 'club_pro';
  const isBasic = plan.id === 'club_basic';
  const isFree = plan.id === 'club_free';

  if (isFree) {
    return (
      <CreateClubButton
        isAuthenticated={isAuthenticated}
        variant={isPro ? "default" : isBasic ? "secondary" : "outline"}
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
        variant={isPro ? "default" : isBasic ? "secondary" : "outline"}
        className="w-full"
        size="lg"
      >
        <span>Выбрать {plan.name}</span>
      </Button>
      
      {/* Additional info */}
      <p className="text-xs text-center text-[#9CA3AF] mt-4">
        Отменить можно в любое время
      </p>
    </>
  );
}

