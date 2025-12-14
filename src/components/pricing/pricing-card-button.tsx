"use client";

import { Button } from "@/components/ui/button";
import { CreateClubButton } from "@/components/clubs/create-club-button";
import type { ClubPlan } from "@/lib/types/billing";

interface PricingCardButtonProps {
  plan: ClubPlan;
  isAuthenticated: boolean;
}

export function PricingCardButton({ plan, isAuthenticated }: PricingCardButtonProps) {
  // New billing v2.0 plan IDs: club_50, club_500, club_unlimited
  const isPro = plan.id === 'club_unlimited';
  const isBasic = plan.id === 'club_50' || plan.id === 'club_500';
  const isFree = plan.id === 'free'; // Free plan doesn't have DB record

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
        <span>Выбрать {plan.title}</span>
      </Button>
      
      {/* Additional info */}
      <p className="text-xs text-center text-[#9CA3AF] mt-4">
        Отменить можно в любое время
      </p>
    </>
  );
}

