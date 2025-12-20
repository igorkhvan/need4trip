"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserMenuItems } from "@/components/layout/user-menu-items";
import { useAuthModalContext } from "@/components/auth/auth-modal-provider";
import { useLogout } from "@/lib/hooks/use-logout";
import { onAuthChanged } from "@/lib/events/auth-events";
import type { CurrentUser } from "@/lib/auth/currentUser";

interface HeaderUserSectionProps {
  currentUser: CurrentUser | null;
}

export function HeaderUserSection({ currentUser: initialUser }: HeaderUserSectionProps) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(initialUser);
  const [menuOpen, setMenuOpen] = useState(false);
  const { openModal } = useAuthModalContext();
  const pathname = usePathname();

  // Centralized logout hook
  const logout = useLogout({ 
    onBefore: () => setMenuOpen(false) 
  });

  // Sync with auth state changes
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const response = await res.json();
          const data = response.data || response;
          setCurrentUser(data.user || null);
        } else {
          // Clear state on auth failure (401/403)
          setCurrentUser(null);
        }
      } catch (err) {
        console.error("[header] Failed to check auth:", err);
        // Clear state on network/fetch error
        setCurrentUser(null);
      }
    };

    // Check auth on mount if no initial user
    if (!initialUser) {
      checkAuth();
    }

    // Listen for auth changes (e.g., after login)
    const cleanup = onAuthChanged(() => {
      checkAuth();
    });

    return cleanup;
  }, [initialUser]);

  const handleLoginClick = () => {
    // Close menu before opening login modal
    setMenuOpen(false);
    
    openModal({
      reason: "REQUIRED",
      title: "Войти в Need4Trip",
      description: "Чтобы продолжить, войдите через Telegram.",
      afterLoginRedirectTo: pathname || "/",
    });
  };

  return (
    <div className="flex items-center gap-3">
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          {currentUser ? (
            /* User Avatar */
            <button
              className="flex items-center justify-center transition-all hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 rounded-full"
              title={currentUser.name || "Меню"}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || 'User')}&background=FF6F2C&color=fff&size=80`}
                  alt={currentUser.name ?? "Пользователь"}
                />
                <AvatarFallback className="text-sm bg-[#FF6F2C] text-white font-semibold">
                  {currentUser.name?.slice(0, 2).toUpperCase() ??
                    currentUser.telegramHandle?.slice(0, 2).toUpperCase() ??
                    "TG"}
                </AvatarFallback>
              </Avatar>
            </button>
          ) : (
            /* Guest User Icon */
            <button
              className="flex h-10 w-10 items-center justify-center rounded-xl transition-all hover:bg-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
              title="Меню"
            >
              <User className="h-5 w-5 text-[#111827]" />
            </button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="p-0">
          {currentUser ? (
            <UserMenuItems
              currentUser={currentUser}
              onLogout={logout}
              onItemClick={() => setMenuOpen(false)}
              variant="dropdown"
            />
          ) : (
            /* Guest Menu */
            <div className="w-56 py-1">
              <button
                onClick={handleLoginClick}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors"
              >
                <User className="h-4 w-4 text-[var(--color-text-muted)]" />
                <span>Войти</span>
              </button>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

