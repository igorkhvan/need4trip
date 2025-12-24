/**
 * MobileNav Component
 * 
 * Mobile navigation drawer with hamburger menu.
 * Only visible on mobile (<md breakpoint).
 * 
 * Features:
 * - Touch-friendly menu button (48px × 48px)
 * - Slide-in drawer from right with swipe-to-close gesture
 * - Navigation links
 * - User menu (Create Event, My Events, Profile, Logout)
 * - Auto-close on route change
 * - Swipe gesture powered by react-swipeable
 * 
 * Performance:
 * - Uses AuthContext instead of fetching /api/auth/me (0 API calls)
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import {
  Sheet,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SwipeableSheetContent,
} from "@/components/ui/swipeable-sheet";
import { Button } from "@/components/ui/button";
import { UserMenuItems } from "@/components/layout/user-menu-items";
import { useAuthModalContext } from "@/components/auth/auth-modal-provider";
import { useLogout } from "@/lib/hooks/use-logout";
import { useAuth } from "@/components/auth/auth-provider";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
}

interface MobileNavProps {
  navItems: NavItem[];
}

export function MobileNav({ navItems }: MobileNavProps) {
  // ⚡ PERFORMANCE: Use auth context instead of fetching /api/auth/me
  // Before: Every mobile nav mount → fetch /api/auth/me (~200ms)
  // After: Read from context → instant (0ms)
  const { user: currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { openModal } = useAuthModalContext();

  // Centralized logout hook
  const logout = useLogout({ 
    onBefore: () => setOpen(false) 
  });

  const handleLoginClick = () => {
    setOpen(false);
    openModal({
      reason: "REQUIRED",
      title: "Войти в Need4Trip",
      description: "Чтобы продолжить, войдите через Telegram.",
      afterLoginRedirectTo: pathname || "/",
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild className="md:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12"
          aria-label="Открыть меню"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SwipeableSheetContent side="right" onOpenChange={setOpen} className="w-[320px] sm:w-[400px]">
        <SheetHeader className="mb-6">
          <SheetTitle>Навигация</SheetTitle>
        </SheetHeader>
        
        {/* Navigation Links */}
        <nav className="flex flex-col gap-2 mb-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center rounded-lg px-4 py-3 text-base font-medium transition-colors",
                  isActive
                    ? "bg-[var(--color-primary-bg)] text-[var(--color-primary)]"
                    : "text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="border-t border-[var(--color-border)] my-4" />

        {/* User Section */}
        {currentUser ? (
          <UserMenuItems
            currentUser={currentUser}
            onLogout={logout}
            onItemClick={() => setOpen(false)}
            variant="sheet"
          />
        ) : (
          <Button 
            onClick={handleLoginClick}
            className="w-full"
          >
            Войти через Telegram
          </Button>
        )}
      </SwipeableSheetContent>
    </Sheet>
  );
}
