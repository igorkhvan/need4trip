/**
 * MobileNav Component
 * 
 * Mobile navigation drawer with hamburger menu.
 * Only visible on mobile (<md breakpoint).
 * 
 * Features:
 * - Touch-friendly menu button (48px × 48px)
 * - Slide-in drawer from left
 * - Navigation links
 * - User menu (Profile + Logout)
 * - Auto-close on route change
 * - Swipe to close gesture (built-in via Radix UI Sheet)
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { UserMenuItems } from "@/components/layout/user-menu-items";
import { useAuthModalContext } from "@/components/auth/auth-modal-provider";
import { cn } from "@/lib/utils";
import type { CurrentUser } from "@/lib/auth/currentUser";

interface NavItem {
  href: string;
  label: string;
}

interface MobileNavProps {
  navItems: NavItem[];
  currentUser: CurrentUser | null;
}

export function MobileNav({ navItems, currentUser: initialUser }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(initialUser);
  const pathname = usePathname();
  const router = useRouter();
  const { openModal } = useAuthModalContext();

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
          setCurrentUser(null);
        }
      } catch (err) {
        console.error("[mobile-nav] Failed to check auth:", err);
        setCurrentUser(null);
      }
    };

    // Listen for auth changes
    const handleAuthChange = () => {
      checkAuth();
    };

    window.addEventListener("auth-changed", handleAuthChange);
    return () => window.removeEventListener("auth-changed", handleAuthChange);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      
      // Dispatch auth change event
      window.dispatchEvent(new Event("auth-changed"));
      
      // Close menu and redirect
      setOpen(false);
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleLoginClick = () => {
    setOpen(false);
    openModal({
      reason: "REQUIRED",
      title: "Войти в Need4Trip",
      description: "Чтобы продолжить, войдите через Telegram.",
      afterLoginRedirectTo: "/profile",
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild className="md:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          aria-label="Открыть меню"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[320px]">
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
            onLogout={handleLogout}
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
      </SheetContent>
    </Sheet>
  );
}
