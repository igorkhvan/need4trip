/**
 * Paywall Modal Component
 * 
 * Modal for displaying paywall triggers and upgrade prompts
 */

"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  DollarSign, 
  Download, 
  MessageCircle, 
  Users, 
  UserPlus,
  Building,
  UserCog,
  Eye,
  BarChart,
  Zap,
} from "lucide-react";
import type { PaywallTrigger, PaywallReason } from "@/lib/types/paywall";
import { getPaywallTitle, getPaywallIcon } from "@/lib/types/paywall";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: PaywallTrigger;
}

// Icon mapping
const iconComponents = {
  Calendar,
  DollarSign,
  Download,
  MessageCircle,
  Users,
  UserPlus,
  Building,
  UserCog,
  Eye,
  BarChart,
};

export function PaywallModal({ open, onOpenChange, trigger }: PaywallModalProps) {
  const router = useRouter();
  
  const iconName = getPaywallIcon(trigger.reason);
  const IconComponent = iconComponents[iconName as keyof typeof iconComponents] || Zap;
  
  const handleSeePricing = () => {
    onOpenChange(false);
    router.push('/pricing');
  };
  
  const handleUpgrade = () => {
    onOpenChange(false);
    router.push(`/pricing#${trigger.requiredPlan}`);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Icon */}
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-50">
            <IconComponent className="h-8 w-8 text-[#FF6F2C]" />
          </div>
          
          {/* Header */}
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-bold text-[#0F172A]">
              {getPaywallTitle(trigger.reason)}
            </DialogTitle>
            <DialogDescription className="text-base text-[#6B7280]">
              {trigger.message}
            </DialogDescription>
          </DialogHeader>
          
          {/* Current vs Required Plan */}
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="default" className="bg-gray-200 text-gray-700">
              {trigger.currentPlan}
            </Badge>
            <span className="text-gray-400">→</span>
            <Badge variant="premium" className="bg-[#FF6F2C] text-white">
              {trigger.requiredPlan}
            </Badge>
          </div>
          
          {/* Details */}
          {trigger.details && (trigger.details.current !== undefined || trigger.details.limit !== undefined) && (
            <div className="w-full rounded-xl bg-gray-50 p-4">
              <div className="flex items-center justify-between text-sm">
                {trigger.details.current !== undefined && (
                  <span className="text-gray-600">
                    Текущее: <span className="font-semibold text-gray-900">{trigger.details.current}</span>
                  </span>
                )}
                {trigger.details.limit !== undefined && (
                  <span className="text-gray-600">
                    Лимит: <span className="font-semibold text-gray-900">{trigger.details.limit}</span>
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex w-full gap-3 pt-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleSeePricing}
            >
              Посмотреть тарифы
            </Button>
            
            <Button 
              className="flex-1"
              onClick={handleUpgrade}
            >
              Обновить план
            </Button>
          </div>
          
          {/* Dismiss link */}
          <button
            onClick={() => onOpenChange(false)}
            className="text-sm text-gray-500 hover:text-gray-700 mt-2"
          >
            Закрыть
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook for managing paywall state
 */
export function usePaywall() {
  const [paywallOpen, setPaywallOpen] = React.useState(false);
  const [paywallTrigger, setPaywallTrigger] = React.useState<PaywallTrigger | null>(null);
  
  const showPaywall = (trigger: PaywallTrigger) => {
    setPaywallTrigger(trigger);
    setPaywallOpen(true);
  };
  
  const hidePaywall = () => {
    setPaywallOpen(false);
    // Delay clearing trigger until animation completes
    setTimeout(() => setPaywallTrigger(null), 300);
  };
  
  return {
    paywallOpen,
    paywallTrigger,
    showPaywall,
    hidePaywall,
  };
}

// Export React for the hook
import React from "react";

