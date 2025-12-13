"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthModalContext } from "@/components/auth/auth-modal-provider";
import type { CurrentUser } from "@/lib/auth/currentUser";

interface HeaderUserSectionProps {
  currentUser: CurrentUser | null;
}

export function HeaderUserSection({ currentUser: initialUser }: HeaderUserSectionProps) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(initialUser);
  const { openModal } = useAuthModalContext();

  // Sync with auth state changes
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user || null);
        }
      } catch (err) {
        console.error("[header] Failed to check auth:", err);
      }
    };

    // Check auth on mount if no initial user
    if (!initialUser) {
      checkAuth();
    }

    // Listen for auth changes (e.g., after login)
    const handleAuthChange = () => {
      checkAuth();
    };

    window.addEventListener("auth-changed", handleAuthChange);
    return () => window.removeEventListener("auth-changed", handleAuthChange);
  }, [initialUser]);

  return (
    <div className="flex items-center gap-3">
      {currentUser ? (
        /* User Profile Icon */
        <Link 
          href="/profile"
          className="flex h-10 w-10 items-center justify-center rounded-xl transition-all hover:bg-[#F9FAFB]"
        >
          {currentUser.avatarUrl ? (
            <Avatar className="h-6 w-6">
              <AvatarImage
                src={currentUser.avatarUrl}
                alt={currentUser.name ?? "Пользователь"}
              />
              <AvatarFallback className="text-xs bg-[#FF6F2C] text-white">
                {currentUser.name?.slice(0, 2).toUpperCase() ??
                  currentUser.telegramHandle?.slice(0, 2).toUpperCase() ??
                  "TG"}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FF6F2C] text-white text-[10px] font-semibold">
              {currentUser.name?.slice(0, 2).toUpperCase() ??
                currentUser.telegramHandle?.slice(0, 2).toUpperCase() ??
                "TG"}
            </div>
          )}
        </Link>
      ) : (
        /* User Icon (opens login modal) */
        <button
          onClick={() => openModal({
            reason: "REQUIRED",
            title: "Войти в Need4Trip",
            description: "Чтобы продолжить, войдите через Telegram.",
          })}
          className="flex h-10 w-10 items-center justify-center rounded-xl transition-all hover:bg-[#F9FAFB]"
        >
          <User className="h-5 w-5 text-[#111827]" />
        </button>
      )}
    </div>
  );
}

