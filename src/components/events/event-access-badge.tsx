/**
 * EventAccessBadge Component
 * 
 * Displays event access type badge using standard Badge component:
 * - Anonymous allowed: "Доступно без регистрации"
 * - Users only: "Только пользователи"
 * - Club only: "Только члены клуба {clubName}"
 * 
 * Used in:
 * - EventCard (list of events)
 * - Event details page (badges row)
 * 
 * ВАЖНО: Использует стандартный Badge из ui/badge.tsx для унификации размеров
 */

import { Users, Lock, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Event } from "@/lib/types/event";

export interface EventAccessBadgeProps {
  event: Event;
  /** Display variant */
  variant?: "full" | "compact";
  /** Badge size (sm/md/lg) - стандартные размеры из Badge компонента */
  size?: "sm" | "md" | "lg";
  /** Additional className */
  className?: string;
}

export function EventAccessBadge({ 
  event, 
  variant = "full",
  size = "sm",
  className 
}: EventAccessBadgeProps) {
  // Priority: Club events > Users only > Anonymous allowed
  
  // 1. Club events (highest priority)
  if (event.isClubEvent && event.club) {
    const text = variant === "compact" 
      ? `Клуб: ${event.club.name}`
      : `Только члены клуба ${event.club.name}`;
      
    return (
      <Badge variant="premium" size={size} className={className}>
        <Shield className="h-3 w-3" />
        {text}
      </Badge>
    );
  }
  
  // 2. Users only (no anonymous)
  if (!event.allowAnonymousRegistration) {
    const text = variant === "compact" 
      ? "Только пользователи"
      : "Только пользователи";
      
    return (
      <Badge variant="info" size={size} className={className}>
        <Lock className="h-3 w-3" />
        {text}
      </Badge>
    );
  }
  
  // 3. Anonymous allowed (default)
  const text = variant === "compact"
    ? "Без регистрации"
    : "Доступно без регистрации";
    
  return (
    <Badge variant="success" size={size} className={className}>
      <Users className="h-3 w-3" />
      {text}
    </Badge>
  );
}
