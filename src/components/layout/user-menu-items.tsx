/**
 * UserMenuItems Component
 * 
 * Переиспользуемый список пунктов меню пользователя.
 * Используется в:
 * - Desktop: DropdownMenu
 * - Mobile: Sheet (боковое меню)
 * 
 * @param currentUser - Данные текущего пользователя (или null)
 * @param onLogout - Callback для выхода из системы
 * @param onItemClick - Callback при клике на пункт меню (для закрытия меню)
 */

"use client";

import { useRouter } from "next/navigation";
import { User, LogOut, PlusCircle, Calendar } from "lucide-react";
import type { CurrentUser } from "@/lib/auth/currentUser";

interface UserMenuItemsProps {
  currentUser: CurrentUser | null;
  onLogout: () => Promise<void>;
  onItemClick?: () => void;
  variant?: "dropdown" | "sheet";
}

export function UserMenuItems({
  currentUser,
  onLogout,
  onItemClick,
  variant = "dropdown",
}: UserMenuItemsProps) {
  const router = useRouter();

  const handleCreateEventClick = () => {
    onItemClick?.();
    router.push("/events/create");
  };

  const handleMyEventsClick = () => {
    onItemClick?.();
    router.push("/events?tab=my");
  };

  const handleProfileClick = () => {
    onItemClick?.();
    router.push("/profile");
  };

  const handleLogoutClick = async () => {
    onItemClick?.();
    await onLogout();
  };

  if (!currentUser) return null;

  // Стили для dropdown (компактные)
  if (variant === "dropdown") {
    return (
      <div className="w-56">
        {/* User Info */}
        <div className="px-2 py-3 border-b border-[var(--color-border)]">
          <p className="text-sm font-semibold text-[var(--color-text)] truncate">
            {currentUser.name || "Пользователь"}
          </p>
          {currentUser.email && (
            <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
              {currentUser.email}
            </p>
          )}
        </div>

        {/* Menu Items */}
        <div className="py-1">
          <button
            onClick={handleCreateEventClick}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--color-primary)] hover:bg-[var(--color-primary-bg)] transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Создать событие</span>
          </button>
          <button
            onClick={handleMyEventsClick}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors"
          >
            <Calendar className="h-4 w-4 text-[var(--color-text-muted)]" />
            <span>Мои события</span>
          </button>
          <button
            onClick={handleProfileClick}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors"
          >
            <User className="h-4 w-4 text-[var(--color-text-muted)]" />
            <span>Профиль</span>
          </button>
        </div>

        {/* Logout */}
        <div className="border-t border-[var(--color-border)] py-1">
          <button
            onClick={handleLogoutClick}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Выйти</span>
          </button>
        </div>
      </div>
    );
  }

  // Стили для sheet (более крупные, touch-friendly)
  return (
    <div className="space-y-2">
      {/* User Info */}
      <div className="px-4 py-3 mb-4 rounded-lg bg-[var(--color-bg-subtle)]">
        <p className="text-base font-semibold text-[var(--color-text)] truncate">
          {currentUser.name || "Пользователь"}
        </p>
        {currentUser.telegramHandle && (
          <p className="text-sm text-[var(--color-text-muted)] truncate mt-1">
            @{currentUser.telegramHandle}
          </p>
        )}
      </div>

      {/* Menu Items */}
      <button
        onClick={handleCreateEventClick}
        className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-bg)] transition-colors"
      >
        <PlusCircle className="h-5 w-5" />
        <span>Создать событие</span>
      </button>
      <button
        onClick={handleMyEventsClick}
        className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors"
      >
        <Calendar className="h-5 w-5 text-[var(--color-text-muted)]" />
        <span>Мои события</span>
      </button>
      <button
        onClick={handleProfileClick}
        className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors"
      >
        <User className="h-5 w-5 text-[var(--color-text-muted)]" />
        <span>Профиль</span>
      </button>

      {/* Logout */}
      <button
        onClick={handleLogoutClick}
        className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] transition-colors"
      >
        <LogOut className="h-5 w-5" />
        <span>Выйти</span>
      </button>
    </div>
  );
}
