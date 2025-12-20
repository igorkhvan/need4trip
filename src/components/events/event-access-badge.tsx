/**
 * EventAccessBadge Component
 * 
 * Displays event access type badge:
 * - Anonymous allowed: "Доступно без регистрации"
 * - Users only: "Только пользователи"
 * - Club only: "Только члены клуба {clubName}"
 * 
 * Used in:
 * - EventCard (list of events)
 * - Event details page (badges row)
 */

import { Users, Lock, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Event } from "@/lib/types/event";

export interface EventAccessBadgeProps {
  event: Event;
  /** Display variant */
  variant?: "full" | "compact";
  /** Additional className */
  className?: string;
}

export function EventAccessBadge({ 
  event, 
  variant = "full",
  className 
}: EventAccessBadgeProps) {
  // Priority: Club events > Users only > Anonymous allowed
  
  // 1. Club events (highest priority)
  if (event.isClubEvent && event.club) {
    const text = variant === "compact" 
      ? `Клуб: ${event.club.name}`
      : `Только члены клуба ${event.club.name}`;
      
    return (
      <div className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium",
        "bg-purple-50 text-purple-700",
        className
      )}>
        <Shield className="h-3.5 w-3.5" />
        <span>{text}</span>
      </div>
    );
  }
  
  // 2. Users only (no anonymous)
  if (!event.allowAnonymousRegistration) {
    const text = variant === "compact" 
      ? "Только пользователи"
      : "Только пользователи";
      
    return (
      <div className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium",
        "bg-blue-50 text-blue-700",
        className
      )}>
        <Lock className="h-3.5 w-3.5" />
        <span>{text}</span>
      </div>
    );
  }
  
  // 3. Anonymous allowed (default)
  const text = variant === "compact"
    ? "Без регистрации"
    : "Доступно без регистрации";
    
  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium",
      "bg-green-50 text-green-700",
      className
    )}>
      <Users className="h-3.5 w-3.5" />
      <span>{text}</span>
    </div>
  );
}
