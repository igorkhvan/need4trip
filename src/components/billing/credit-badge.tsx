/**
 * Credit Badge Component
 * 
 * Показывает количество доступных апгрейдов в header.
 * При клике открывает dropdown с информацией о credits.
 * 
 * Usage:
 * - Header (desktop + mobile)
 * - Reads from AuthContext (0 API calls)
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function CreditBadge() {
  const { user } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  // Don't show if no user or no credits
  if (!user || !user.availableCreditsCount || user.availableCreditsCount === 0) {
    return null;
  }

  const handleCreateEvent = () => {
    setMenuOpen(false);
    router.push("/events/create");
  };

  const handleViewProfile = () => {
    setMenuOpen(false);
    router.push("/profile?tab=credits");
  };

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 transition-all hover:bg-[var(--color-primary-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
          title={`Доступно апгрейдов: ${user.availableCreditsCount}`}
        >
          <Zap className="h-4 w-4 text-[var(--color-primary)]" />
          <span className="text-sm font-semibold text-[var(--color-primary)]">
            {user.availableCreditsCount}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-4">
        {/* Header */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-5 w-5 text-[var(--color-primary)]" />
            <h3 className="text-base font-semibold text-[var(--color-text)]">
              Доступные апгрейды
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            У вас {pluralizeCredits(user.availableCreditsCount)}
          </p>
        </div>

        {/* Info */}
        <div className="bg-[var(--color-bg-subtle)] rounded-lg p-3 mb-3">
          <p className="text-sm text-[var(--color-text)] mb-1">
            <strong>Тип апгрейда:</strong> Событие до 500 участников
          </p>
          <p className="text-sm text-muted-foreground">
            Используйте при создании или редактировании события
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button
            onClick={handleCreateEvent}
            className="w-full"
            size="sm"
          >
            <Zap className="h-4 w-4 mr-2" />
            Создать событие
          </Button>
          <Button
            onClick={handleViewProfile}
            variant="outline"
            className="w-full"
            size="sm"
          >
            Подробнее в профиле
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Pluralize credits count (Russian)
 */
function pluralizeCredits(count: number): string {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return `${count} апгрейдов`;
  }

  if (lastDigit === 1) {
    return `${count} апгрейд`;
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${count} апгрейда`;
  }

  return `${count} апгрейдов`;
}

